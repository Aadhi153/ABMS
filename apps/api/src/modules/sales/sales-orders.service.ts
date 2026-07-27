import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SalesOrderStatus, StockMovementType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateSalesOrderInput } from "./dto/sales-order.input";

const ORDER_INCLUDE = {
  customer: true,
  createdBy: true,
  items: { include: { product: true } },
  invoice: true,
} as const;

function toModel<T extends {
  customer: { name: string };
  createdBy: { name: string };
  items: Array<{ id: string; productId: string; quantity: number; unitPrice: unknown; product: { name: string; sku: string } }>;
  invoice: unknown;
}>(row: T) {
  const items = row.items.map((i) => ({
    id: i.id,
    productId: i.productId,
    productName: i.product.name,
    sku: i.product.sku,
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    lineTotal: i.quantity * Number(i.unitPrice),
  }));
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  return {
    ...row,
    customerName: row.customer.name,
    createdByName: row.createdBy.name,
    items,
    subtotal,
    hasInvoice: !!row.invoice,
  };
}

@Injectable()
export class SalesOrdersService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.salesOrder.findMany({ include: ORDER_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.salesOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextOrderNumber() {
    const count = await this.prisma.salesOrder.count();
    return `SO-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateSalesOrderInput, actorId: string, organizationId: string) {
    for (const item of input.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
    }
    const orderNumber = await this.nextOrderNumber();
    const row = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        dealId: input.dealId,
        createdById: actorId,
        organizationId,
        items: { create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })) },
      },
      include: ORDER_INCLUDE,
    });
    return toModel(row);
  }

  async confirm(id: string, warehouseId: string, actorId: string, organizationId: string) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
    if (!order) throw new NotFoundException("Sales order not found");
    if (order.status !== SalesOrderStatus.DRAFT) throw new BadRequestException("Only draft orders can be confirmed");
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException("Warehouse not found");

    const levels = await this.prisma.stockLevel.findMany({
      where: { warehouseId, productId: { in: order.items.map((i) => i.productId) } },
    });
    const levelByProduct = new Map(levels.map((l) => [l.productId, l.quantity]));
    for (const item of order.items) {
      const available = levelByProduct.get(item.productId) ?? 0;
      if (available < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name} at ${warehouse.name} (have ${available}, need ${item.quantity})`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.stockLevel.update({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockLedgerEntry.create({
          data: {
            productId: item.productId,
            warehouseId,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            reason: `Sale ${order.orderNumber}`,
            relatedSalesOrderId: order.id,
            createdById: actorId,
            organizationId,
          },
        });
      }
      await tx.salesOrder.update({ where: { id }, data: { status: SalesOrderStatus.CONFIRMED } });
    });

    return this.findById(id);
  }

  async cancel(id: string) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Sales order not found");
    if (order.status !== SalesOrderStatus.DRAFT) throw new ConflictException("Only draft orders can be cancelled");
    return this.prisma.salesOrder.update({ where: { id }, data: { status: SalesOrderStatus.CANCELLED } });
  }

  async delete(id: string) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Sales order not found");
    if (order.status === SalesOrderStatus.CONFIRMED || order.status === SalesOrderStatus.DELIVERED) {
      throw new ConflictException("Cannot delete a confirmed order — cancel it instead, or use as historical record");
    }
    await this.prisma.salesOrder.delete({ where: { id } });
    return order;
  }
}
