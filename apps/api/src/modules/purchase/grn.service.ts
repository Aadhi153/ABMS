import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { GrnStatus, PurchaseOrderStatus, PurchaseOrderTaxMethod, StockMovementType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { addressToColumns, columnsToAddress } from "./address-columns.util";
import type { CreateGrnInput, GrnItemInput } from "./dto/grn.input";

const GRN_INCLUDE = {
  purchaseOrder: { include: { supplier: true } },
  warehouse: true,
  receivedBy: true,
  bankAccount: true,
  items: { include: { purchaseOrderItem: { include: { product: true } }, warehouse: true } },
} as const;

function computeLine(item: { quantity: number; unitPrice: number; discountPct: number; taxPct: number }, taxMethod: PurchaseOrderTaxMethod) {
  const gross = item.quantity * item.unitPrice;
  const base = taxMethod === PurchaseOrderTaxMethod.INCLUSIVE ? gross / (1 + item.taxPct / 100) : gross;
  const discountAmt = base * (item.discountPct / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (item.taxPct / 100);
  return { base, discountAmt, taxAmt, lineTotal: afterDiscount + taxAmt };
}

function toModel<T extends {
  purchaseOrder: { poNumber: string; supplierId: string; supplier: { name: string } };
  warehouse: { name: string };
  receivedBy: { name: string };
  bankAccount: { name: string } | null;
  subtotal: unknown;
  shippingAmount: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  total: unknown;
  items: Array<{
    id: string;
    purchaseOrderItemId: string;
    quantityReceived: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    batchNumber: string | null;
    unitPrice: unknown;
    discountPct: unknown;
    taxPct: unknown;
    warehouseId: string | null;
    warehouse: { name: string } | null;
    lineTotal: unknown;
    purchaseOrderItem: { productId: string; quantity: number; hsnSac: string | null; product: { name: string; sku: string } };
  }>;
}>(row: T) {
  return {
    ...row,
    poNumber: row.purchaseOrder.poNumber,
    supplierId: row.purchaseOrder.supplierId,
    supplierName: row.purchaseOrder.supplier.name,
    warehouseName: row.warehouse.name,
    receivedByName: row.receivedBy.name,
    bankAccountName: row.bankAccount?.name ?? null,
    subtotal: Number(row.subtotal),
    shippingAmount: Number(row.shippingAmount),
    discountAmount: Number(row.discountAmount),
    taxAmount: Number(row.taxAmount),
    total: Number(row.total),
    vendorAddress: columnsToAddress(row as unknown as Record<string, unknown>, "vendorAddress"),
    deliveryAddress: columnsToAddress(row as unknown as Record<string, unknown>, "deliveryAddress"),
    items: row.items.map((i) => ({
      id: i.id,
      purchaseOrderItemId: i.purchaseOrderItemId,
      productId: i.purchaseOrderItem.productId,
      productName: i.purchaseOrderItem.product.name,
      sku: i.purchaseOrderItem.product.sku,
      hsnSac: i.purchaseOrderItem.hsnSac,
      orderedQuantity: i.purchaseOrderItem.quantity,
      quantityReceived: i.quantityReceived,
      acceptedQuantity: i.acceptedQuantity,
      rejectedQuantity: i.rejectedQuantity,
      batchNumber: i.batchNumber,
      unitPrice: Number(i.unitPrice),
      discountPct: Number(i.discountPct),
      taxPct: Number(i.taxPct),
      warehouseId: i.warehouseId,
      warehouseName: i.warehouse?.name ?? null,
      lineTotal: Number(i.lineTotal),
    })),
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
    const taxMethod = input.taxMethod ?? PurchaseOrderTaxMethod.EXCLUSIVE;
    const lines = input.items.map((item: GrnItemInput) => {
      const poItem = poItemById.get(item.purchaseOrderItemId);
      if (!poItem) throw new NotFoundException(`Purchase order item ${item.purchaseOrderItemId} not found`);
      const remaining = poItem.quantity - poItem.receivedQuantity;
      if (item.quantityReceived > remaining) {
        throw new BadRequestException(`Cannot receive ${item.quantityReceived} — only ${remaining} outstanding`);
      }
      if (item.acceptedQuantity + item.rejectedQuantity !== item.quantityReceived) {
        throw new BadRequestException("Accepted + rejected quantity must equal the quantity received");
      }
      const unitPrice = item.unitPrice ?? Number(poItem.unitCost);
      const normalized = { quantity: item.quantityReceived, unitPrice, discountPct: item.discountPct ?? 0, taxPct: item.taxPct ?? 0 };
      return { input: item, poItem, unitPrice, ...computeLine(normalized, taxMethod) };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.base, 0);
    const discountAmount = lines.reduce((sum, l) => sum + l.discountAmt, 0);
    const taxAmount = lines.reduce((sum, l) => sum + l.taxAmt, 0);
    const shippingAmount = input.shippingAmount ?? 0;
    const total = subtotal - discountAmount + taxAmount + shippingAmount;

    const grnNumber = await this.nextGrnNumber();
    await this.prisma.$transaction(async (tx) => {
      await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          purchaseOrderId: input.purchaseOrderId,
          warehouseId: input.warehouseId,
          receivedById: actorId,
          status: input.status ?? GrnStatus.COMPLETED,
          qualityScore: input.qualityScore ?? 100,
          taxId: input.taxId,
          bankAccountId: input.bankAccountId,
          taxMethod,
          supplierNotes: input.supplierNotes,
          termsConditions: input.termsConditions,
          internalNotes: input.internalNotes,
          shippingAmount,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          ...addressToColumns("vendorAddress", input.vendorAddress),
          ...addressToColumns("deliveryAddress", input.deliveryAddress),
          organizationId,
          items: {
            create: lines.map((l) => ({
              purchaseOrderItemId: l.input.purchaseOrderItemId,
              quantityReceived: l.input.quantityReceived,
              acceptedQuantity: l.input.acceptedQuantity,
              rejectedQuantity: l.input.rejectedQuantity,
              batchNumber: l.input.batchNumber,
              unitPrice: l.unitPrice,
              discountPct: l.input.discountPct ?? 0,
              taxPct: l.input.taxPct ?? 0,
              warehouseId: l.input.warehouseId,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      for (const line of lines) {
        const poItem = line.poItem;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: { increment: line.input.quantityReceived } },
        });
        // Only accepted stock posts to inventory — rejected units never hit stock.
        if (line.input.acceptedQuantity > 0) {
          await tx.stockLevel.upsert({
            where: { productId_warehouseId: { productId: poItem.productId, warehouseId: input.warehouseId } },
            create: { productId: poItem.productId, warehouseId: input.warehouseId, quantity: line.input.acceptedQuantity, organizationId },
            update: { quantity: { increment: line.input.acceptedQuantity } },
          });
          await tx.stockLedgerEntry.create({
            data: {
              productId: poItem.productId,
              warehouseId: input.warehouseId,
              type: StockMovementType.PURCHASE,
              quantity: line.input.acceptedQuantity,
              reason: `Receipt ${grnNumber} (${order.poNumber})`,
              relatedPurchaseOrderId: order.id,
              createdById: actorId,
              organizationId,
            },
          });
        }
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: order.id } });
      const allReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
      const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: allReceived ? PurchaseOrderStatus.RECEIVED : anyReceived ? PurchaseOrderStatus.PARTIALLY_RECEIVED : order.status },
      });
    });

    const row = await this.prisma.goodsReceivedNote.findFirst({ where: { grnNumber }, include: GRN_INCLUDE });
    return toModel(row!);
  }
}
