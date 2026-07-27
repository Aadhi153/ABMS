import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PurchaseOrderStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreatePurchaseOrderInput } from "./dto/purchase-order.input";

const PO_INCLUDE = {
  supplier: true,
  createdBy: true,
  items: { include: { product: true } },
  bills: true,
} as const;

function toModel<T extends {
  supplier: { name: string };
  createdBy: { name: string };
  items: Array<{ id: string; productId: string; quantity: number; unitCost: unknown; receivedQuantity: number; product: { name: string; sku: string } }>;
  bills: unknown[];
}>(row: T) {
  const items = row.items.map((i) => ({
    id: i.id,
    productId: i.productId,
    productName: i.product.name,
    sku: i.product.sku,
    quantity: i.quantity,
    unitCost: Number(i.unitCost),
    receivedQuantity: i.receivedQuantity,
    lineTotal: i.quantity * Number(i.unitCost),
  }));
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  return { ...row, supplierName: row.supplier.name, createdByName: row.createdBy.name, items, subtotal, hasBill: row.bills.length > 0 };
}

@Injectable()
export class PurchaseOrdersService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.purchaseOrder.findMany({ include: PO_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: PO_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextPoNumber() {
    const count = await this.prisma.purchaseOrder.count();
    return `PO-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreatePurchaseOrderInput, actorId: string, organizationId: string) {
    for (const item of input.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
    }
    const poNumber = await this.nextPoNumber();
    const row = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: input.supplierId,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
        createdById: actorId,
        organizationId,
        items: { create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })) },
      },
      include: PO_INCLUDE,
    });
    return toModel(row);
  }

  async send(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Purchase order not found");
    if (order.status !== PurchaseOrderStatus.DRAFT) throw new BadRequestException("Only draft orders can be sent");
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.SENT } });
  }

  async delete(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Purchase order not found");
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException("Only draft orders can be deleted");
    }
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return order;
  }
}
