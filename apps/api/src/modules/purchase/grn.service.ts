import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PurchaseOrderStatus, StockMovementType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateGrnInput } from "./dto/grn.input";

const GRN_INCLUDE = {
  purchaseOrder: true,
  warehouse: true,
  receivedBy: true,
  items: { include: { purchaseOrderItem: { include: { product: true } } } },
} as const;

function toModel<T extends {
  purchaseOrder: { poNumber: string };
  warehouse: { name: string };
  receivedBy: { name: string };
  items: Array<{ id: string; quantityReceived: number; purchaseOrderItem: { product: { name: string } } }>;
}>(row: T) {
  return {
    ...row,
    poNumber: row.purchaseOrder.poNumber,
    warehouseName: row.warehouse.name,
    receivedByName: row.receivedBy.name,
    items: row.items.map((i) => ({ id: i.id, productName: i.purchaseOrderItem.product.name, quantityReceived: i.quantityReceived })),
  };
}

@Injectable()
export class GrnService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.goodsReceivedNote.findMany({ include: GRN_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  private async nextGrnNumber() {
    const count = await this.prisma.goodsReceivedNote.count();
    return `GRN-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateGrnInput, actorId: string, organizationId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id: input.purchaseOrderId }, include: { items: true } });
    if (!order) throw new NotFoundException("Purchase order not found");
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) throw new NotFoundException("Warehouse not found");

    const poItemById = new Map(order.items.map((i) => [i.id, i]));
    for (const item of input.items) {
      const poItem = poItemById.get(item.purchaseOrderItemId);
      if (!poItem) throw new NotFoundException(`Purchase order item ${item.purchaseOrderItemId} not found`);
      const remaining = poItem.quantity - poItem.receivedQuantity;
      if (item.quantityReceived > remaining) {
        throw new BadRequestException(`Cannot receive ${item.quantityReceived} — only ${remaining} outstanding`);
      }
    }

    const grnNumber = await this.nextGrnNumber();
    await this.prisma.$transaction(async (tx) => {
      const grn = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          purchaseOrderId: input.purchaseOrderId,
          warehouseId: input.warehouseId,
          receivedById: actorId,
          organizationId,
          items: { create: input.items.map((i) => ({ purchaseOrderItemId: i.purchaseOrderItemId, quantityReceived: i.quantityReceived })) },
        },
      });

      for (const item of input.items) {
        const poItem = poItemById.get(item.purchaseOrderItemId)!;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: { increment: item.quantityReceived } },
        });
        await tx.stockLevel.upsert({
          where: { productId_warehouseId: { productId: poItem.productId, warehouseId: input.warehouseId } },
          create: { productId: poItem.productId, warehouseId: input.warehouseId, quantity: item.quantityReceived, organizationId },
          update: { quantity: { increment: item.quantityReceived } },
        });
        await tx.stockLedgerEntry.create({
          data: {
            productId: poItem.productId,
            warehouseId: input.warehouseId,
            type: StockMovementType.PURCHASE,
            quantity: item.quantityReceived,
            reason: `Receipt ${grnNumber} (${order.poNumber})`,
            relatedPurchaseOrderId: order.id,
            createdById: actorId,
            organizationId,
          },
        });
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
      const allReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
      const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: allReceived ? PurchaseOrderStatus.RECEIVED : anyReceived ? PurchaseOrderStatus.PARTIALLY_RECEIVED : order.status },
      });

      return grn;
    });

    const row = await this.prisma.goodsReceivedNote.findFirst({ where: { grnNumber }, include: GRN_INCLUDE });
    return toModel(row!);
  }
}
