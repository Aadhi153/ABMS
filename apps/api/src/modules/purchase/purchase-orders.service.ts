import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PurchaseOrderStatus, PurchaseOrderTaxMethod } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { addressToColumns, columnsToAddress } from "./address-columns.util";
import type { CreatePurchaseOrderInput, PurchaseOrderItemInput } from "./dto/purchase-order.input";

const PO_INCLUDE = {
  supplier: true,
  createdBy: true,
  items: { include: { product: true, warehouse: true }, orderBy: { sortOrder: "asc" as const } },
  bills: true,
} as const;

function computeLine(item: { quantity: number; unitCost: number; discountPct: number; taxPct: number }, taxMethod: PurchaseOrderTaxMethod) {
  const gross = item.quantity * item.unitCost;
  const base = taxMethod === PurchaseOrderTaxMethod.INCLUSIVE ? gross / (1 + item.taxPct / 100) : gross;
  const discountAmt = base * (item.discountPct / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (item.taxPct / 100);
  return { base, discountAmt, taxAmt, lineTotal: afterDiscount + taxAmt };
}

function toModel<T extends {
  supplier: { name: string };
  createdBy: { name: string };
  subtotal: unknown;
  shippingAmount: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  total: unknown;
  items: Array<{
    id: string;
    productId: string;
    hsnSac: string | null;
    quantity: number;
    uom: string;
    unitCost: unknown;
    discountPct: unknown;
    taxPct: unknown;
    warehouseId: string | null;
    warehouse: { name: string } | null;
    receivedQuantity: number;
    lineTotal: unknown;
    product: { name: string; sku: string };
  }>;
  bills: Array<{ status: string }>;
}>(row: T) {
  const items = row.items.map((i) => ({
    ...i,
    productName: i.product.name,
    sku: i.product.sku,
    warehouseName: i.warehouse?.name ?? null,
    unitCost: Number(i.unitCost),
    discountPct: Number(i.discountPct),
    taxPct: Number(i.taxPct),
    lineTotal: Number(i.lineTotal),
  }));
  return {
    ...row,
    supplierName: row.supplier.name,
    createdByName: row.createdBy.name,
    items,
    subtotal: Number(row.subtotal),
    shippingAmount: Number(row.shippingAmount),
    discountAmount: Number(row.discountAmount),
    taxAmount: Number(row.taxAmount),
    total: Number(row.total),
    supplierAddress: columnsToAddress(row as unknown as Record<string, unknown>, "supplierAddress"),
    deliveryAddress: columnsToAddress(row as unknown as Record<string, unknown>, "deliveryAddress"),
    hasBill: row.bills.length > 0,
    billStatus: row.bills[0]?.status ?? null,
  };
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
    const taxMethod = input.taxMethod ?? PurchaseOrderTaxMethod.EXCLUSIVE;
    const lines = input.items.map((i: PurchaseOrderItemInput) => {
      const normalized = { quantity: i.quantity, unitCost: i.unitCost, discountPct: i.discountPct ?? 0, taxPct: i.taxPct ?? 0 };
      return { input: i, ...computeLine(normalized, taxMethod) };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.base, 0);
    const discountAmount = lines.reduce((sum, l) => sum + l.discountAmt, 0);
    const taxAmount = lines.reduce((sum, l) => sum + l.taxAmt, 0);
    const shippingAmount = input.shippingAmount ?? 0;
    const total = subtotal - discountAmount + taxAmount + shippingAmount;

    const poNumber = await this.nextPoNumber();
    const row = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: input.supplierId,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
        trackingCode: input.trackingCode,
        currency: input.currency ?? "INR",
        paymentTerms: input.paymentTerms,
        taxMethod,
        supplierNotes: input.supplierNotes,
        termsConditions: input.termsConditions,
        internalNotes: input.internalNotes,
        shippingAmount,
        subtotal,
        discountAmount,
        taxAmount,
        total,
        ...addressToColumns("supplierAddress", input.supplierAddress),
        ...addressToColumns("deliveryAddress", input.deliveryAddress),
        createdById: actorId,
        organizationId,
        items: {
          create: lines.map((l, idx) => ({
            productId: l.input.productId,
            hsnSac: l.input.hsnSac,
            quantity: l.input.quantity,
            uom: l.input.uom ?? "unit",
            unitCost: l.input.unitCost,
            discountPct: l.input.discountPct ?? 0,
            taxPct: l.input.taxPct ?? 0,
            warehouseId: l.input.warehouseId,
            lineTotal: l.lineTotal,
            sortOrder: idx,
          })),
        },
      },
      include: PO_INCLUDE,
    });
    return toModel(row);
  }

  async send(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Purchase order not found");
    if (order.status !== PurchaseOrderStatus.DRAFT) throw new BadRequestException("Only draft orders can be sent");
    await this.prisma.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.SENT } });
    return this.findById(id);
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
