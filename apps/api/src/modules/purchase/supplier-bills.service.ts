import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus, DebitNoteStatus, LedgerEntryType, PurchaseOrderTaxMethod, SupplierBillStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { addressToColumns, columnsToAddress } from "./address-columns.util";
import type { CreateSupplierBillInput, SupplierBillItemInput } from "./dto/supplier-bill.input";

const BILL_INCLUDE = {
  supplier: true,
  purchaseOrder: true,
  items: { include: { product: true, warehouse: true }, orderBy: { sortOrder: "asc" as const } },
  payments: { orderBy: { paidAt: "asc" as const } },
  debitNotes: { orderBy: { createdAt: "asc" as const } },
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
  purchaseOrder: { poNumber: string } | null;
  amount: unknown;
  shippingAmount: unknown;
  subtotal: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  dueDate: Date;
  payments: Array<{ amount: unknown; status: ApprovalStatus }>;
  debitNotes: Array<{ amount: unknown; status: DebitNoteStatus }>;
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
    lineTotal: unknown;
    product: { name: string; sku: string };
  }>;
}>(row: T) {
  const amount = Number(row.amount);
  const amountPaid = row.payments
    .filter((p) => p.status === ApprovalStatus.APPROVED)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const amountDebited = row.debitNotes
    .filter((d) => d.status !== DebitNoteStatus.VOIDED)
    .reduce((sum, d) => sum + Number(d.amount), 0);
  const remaining = Math.max(0, amount - amountPaid - amountDebited);
  let status: string = remaining <= 0 ? SupplierBillStatus.PAID : SupplierBillStatus.UNPAID;
  if (remaining > 0) {
    if (amountPaid > 0) status = SupplierBillStatus.PARTIAL;
    else if (row.dueDate.getTime() < Date.now()) status = SupplierBillStatus.OVERDUE;
  }
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
    poNumber: row.purchaseOrder?.poNumber ?? null,
    items,
    amount,
    shippingAmount: Number(row.shippingAmount),
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discountAmount),
    taxAmount: Number(row.taxAmount),
    amountPaid,
    amountDebited,
    remaining,
    status,
    billingAddress: columnsToAddress(row as unknown as Record<string, unknown>, "billingAddress"),
    shippingAddress: columnsToAddress(row as unknown as Record<string, unknown>, "shippingAddress"),
  };
}

@Injectable()
export class SupplierBillsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.supplierBill.findMany({ include: BILL_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.supplierBill.findUnique({ where: { id }, include: BILL_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextBillNumber() {
    const count = await this.prisma.supplierBill.count();
    return `BILL-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateSupplierBillInput, organizationId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new NotFoundException("Supplier not found");

    const taxMethod = input.taxMethod ?? PurchaseOrderTaxMethod.EXCLUSIVE;
    const lines = input.items.map((i: SupplierBillItemInput) => {
      const normalized = { quantity: i.quantity, unitCost: i.unitCost, discountPct: i.discountPct ?? 0, taxPct: i.taxPct ?? 0 };
      return { input: i, ...computeLine(normalized, taxMethod) };
    });
    const subtotal = lines.reduce((sum, l) => sum + l.base, 0);
    const discountAmount = lines.reduce((sum, l) => sum + l.discountAmt, 0);
    const taxAmount = lines.reduce((sum, l) => sum + l.taxAmt, 0);
    const shippingAmount = input.shippingAmount ?? 0;
    const amount = subtotal - discountAmount + taxAmount + shippingAmount;

    const billNumber = await this.nextBillNumber();
    const row = await this.prisma.supplierBill.create({
      data: {
        billNumber,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
        invoiceReference: input.invoiceReference,
        invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : undefined,
        paymentTerms: input.paymentTerms,
        taxMethod,
        supplierNotes: input.supplierNotes,
        termsConditions: input.termsConditions,
        internalNotes: input.internalNotes,
        shippingAmount,
        subtotal,
        discountAmount,
        taxAmount,
        amount,
        dueDate: new Date(input.dueDate),
        status: SupplierBillStatus.UNPAID,
        ...addressToColumns("billingAddress", input.billingAddress),
        ...addressToColumns("shippingAddress", input.shippingAddress),
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
      include: BILL_INCLUDE,
    });
    await this.prisma.ledgerEntry.create({
      data: {
        type: LedgerEntryType.PAYABLE,
        amount,
        description: `Bill ${billNumber} — ${supplier.name}`,
        relatedSupplierBillId: row.id,
        organizationId,
      },
    });
    return toModel(row);
  }

  /** Recomputes and persists the denormalized status column after a payment/debit-note change. */
  async recomputeStatus(id: string) {
    const model = await this.findById(id);
    if (!model) throw new NotFoundException("Supplier bill not found");
    await this.prisma.supplierBill.update({ where: { id }, data: { status: model.status as SupplierBillStatus } });
    return model;
  }
}
