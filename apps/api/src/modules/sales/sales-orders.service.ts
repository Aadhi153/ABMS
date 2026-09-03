import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { SalesOrderStatus, SalesOrderTaxMethod, StockMovementType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateSalesOrderInput, SalesOrderItemInput } from "./dto/sales-order.input";

const ORDER_INCLUDE = {
  customer: true,
  createdBy: true,
  priceList: true,
  items: { include: { product: true, warehouse: true }, orderBy: { sortOrder: "asc" as const } },
  invoice: true,
} as const;

function computeLine(item: { quantity: number; unitPrice: number; discountPct: number; taxPct: number }, taxMethod: SalesOrderTaxMethod) {
  const gross = item.quantity * item.unitPrice;
  const base = taxMethod === SalesOrderTaxMethod.INCLUSIVE ? gross / (1 + item.taxPct / 100) : gross;
  const discountAmt = base * (item.discountPct / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (item.taxPct / 100);
  return { base, discountAmt, taxAmt, lineTotal: afterDiscount + taxAmt };
}

function toModel<T extends {
  customer: { name: string };
  createdBy: { name: string };
  priceList: { name: string } | null;
  subtotal: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  shippingAmount: unknown;
  total: unknown;
  invoice: unknown;
  items: Array<{
    id: string;
    productId: string;
    hsnSac: string | null;
    quantity: number;
    uom: string;
    unitPrice: unknown;
    discountPct: unknown;
    taxPct: unknown;
    warehouseId: string | null;
    warehouse: { name: string } | null;
    lineTotal: unknown;
    product: { name: string; sku: string };
  }>;
}>(row: T) {
  const items = row.items.map((i) => ({
    ...i,
    productName: i.product.name,
    sku: i.product.sku,
    warehouseName: i.warehouse?.name ?? null,
    unitPrice: Number(i.unitPrice),
    discountPct: Number(i.discountPct),
    taxPct: Number(i.taxPct),
    lineTotal: Number(i.lineTotal),
  }));
  return {
    ...row,
    customerName: row.customer.name,
    createdByName: row.createdBy.name,
    priceListName: row.priceList?.name ?? null,
    items,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discountAmount),
    taxAmount: Number(row.taxAmount),
    shippingAmount: Number(row.shippingAmount),
    total: Number(row.total),
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
    const taxMethod = input.taxMethod ?? SalesOrderTaxMethod.EXCLUSIVE;
    const lines = input.items.map((i: SalesOrderItemInput) => {
      const normalized = {
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPct: i.discountPct ?? 0,
        taxPct: i.taxPct ?? 0,
      };
      return { input: i, ...computeLine(normalized, taxMethod) };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.base, 0);
    const discountAmount = lines.reduce((sum, l) => sum + l.discountAmt, 0);
    const taxAmount = lines.reduce((sum, l) => sum + l.taxAmt, 0);
    const shippingAmount = input.shippingAmount ?? 0;
    const total = subtotal - discountAmount + taxAmount + shippingAmount;

    const orderNumber = await this.nextOrderNumber();
    const row = await this.prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        dealId: input.dealId,
        promisedDate: input.promisedDate,
        reference: input.reference,
        paymentTerms: input.paymentTerms,
        priceListId: input.priceListId,
        taxMethod,
        customerNotes: input.customerNotes,
        termsConditions: input.termsConditions,
        internalNotes: input.internalNotes,
        shippingAmount,
        subtotal,
        discountAmount,
        taxAmount,
        total,
        createdById: actorId,
        organizationId,
        items: {
          create: lines.map((l, idx) => ({
            productId: l.input.productId,
            hsnSac: l.input.hsnSac,
            quantity: l.input.quantity,
            uom: l.input.uom ?? "unit",
            unitPrice: l.input.unitPrice,
            discountPct: l.input.discountPct ?? 0,
            taxPct: l.input.taxPct ?? 0,
            warehouseId: l.input.warehouseId,
            lineTotal: l.lineTotal,
            sortOrder: idx,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });
    return toModel(row);
  }

  async confirm(id: string, fallbackWarehouseId: string | undefined, actorId: string, organizationId: string) {
    const order = await this.prisma.salesOrder.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
    if (!order) throw new NotFoundException("Sales order not found");
    if (order.status !== SalesOrderStatus.DRAFT) throw new BadRequestException("Only draft orders can be confirmed");

    const resolved = order.items.map((item) => {
      const warehouseId = item.warehouseId ?? fallbackWarehouseId;
      if (!warehouseId) throw new BadRequestException(`No warehouse specified for ${item.product.name}`);
      return { item, warehouseId };
    });

    const warehouseIds = [...new Set(resolved.map((r) => r.warehouseId))];
    const warehouses = await this.prisma.warehouse.findMany({ where: { id: { in: warehouseIds } } });
    const warehouseById = new Map(warehouses.map((w) => [w.id, w]));
    for (const id of warehouseIds) {
      if (!warehouseById.has(id)) throw new NotFoundException("Warehouse not found");
    }

    const levels = await this.prisma.stockLevel.findMany({
      where: {
        productId: { in: order.items.map((i) => i.productId) },
        warehouseId: { in: warehouseIds },
      },
    });
    const levelByKey = new Map(levels.map((l) => [`${l.productId}:${l.warehouseId}`, l.quantity]));
    for (const { item, warehouseId } of resolved) {
      const available = levelByKey.get(`${item.productId}:${warehouseId}`) ?? 0;
      if (available < item.quantity) {
        const warehouse = warehouseById.get(warehouseId)!;
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name} at ${warehouse.name} (have ${available}, need ${item.quantity})`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const { item, warehouseId } of resolved) {
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
