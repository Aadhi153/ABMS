import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DebitNoteStatus, DebitNoteType, PurchaseOrderTaxMethod, StockMovementType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { addressToColumns, columnsToAddress } from "./address-columns.util";
import { SupplierBillsService } from "./supplier-bills.service";
import type { CreateDebitNoteInput, DebitNoteItemInput } from "./dto/debit-note.input";

const DEBIT_NOTE_INCLUDE = {
  bill: { include: { supplier: true } },
  warehouse: true,
  settlementAccount: true,
  items: { include: { product: true } },
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
  bill: { billNumber: string; supplierId: string; supplier: { name: string } };
  warehouse: { name: string } | null;
  settlementAccount: { name: string } | null;
  grossAmount: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  amount: unknown;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    uom: string;
    unitPrice: unknown;
    discountPct: unknown;
    taxPct: unknown;
    lineTotal: unknown;
    product: { name: string; sku: string };
  }>;
}>(row: T) {
  return {
    ...row,
    billNumber: row.bill.billNumber,
    supplierId: row.bill.supplierId,
    supplierName: row.bill.supplier.name,
    warehouseName: row.warehouse?.name ?? null,
    settlementAccountName: row.settlementAccount?.name ?? null,
    grossAmount: Number(row.grossAmount),
    discountAmount: Number(row.discountAmount),
    taxAmount: Number(row.taxAmount),
    amount: Number(row.amount),
    partnerAddress: columnsToAddress(row as unknown as Record<string, unknown>, "partnerAddress"),
    items: row.items.map((i) => ({
      ...i,
      productName: i.product.name,
      sku: i.product.sku,
      unitPrice: Number(i.unitPrice),
      discountPct: Number(i.discountPct),
      taxPct: Number(i.taxPct),
      lineTotal: Number(i.lineTotal),
    })),
  };
}

@Injectable()
export class DebitNotesService {
  constructor(
    @Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient,
    private readonly supplierBillsService: SupplierBillsService,
  ) {}

  async findAll() {
    const rows = await this.prisma.debitNote.findMany({ include: DEBIT_NOTE_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.debitNote.findUnique({ where: { id }, include: DEBIT_NOTE_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextDebitNoteNumber() {
    const count = await this.prisma.debitNote.count();
    return `DN-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateDebitNoteInput, actorId: string, organizationId: string) {
    const bill = await this.supplierBillsService.findById(input.billId);
    if (!bill) throw new NotFoundException("Supplier bill not found");
    if (bill.remaining <= 0) throw new BadRequestException("Bill is already fully paid or covered");

    const type = input.type ?? DebitNoteType.OTHER;
    const isReturn = type === DebitNoteType.PURCHASE_RETURN;
    if (isReturn && !input.warehouseId) {
      throw new BadRequestException("A warehouse is required for a purchase return");
    }

    const taxMethod = input.taxMethod ?? PurchaseOrderTaxMethod.EXCLUSIVE;
    const lines = input.items.map((i: DebitNoteItemInput) => {
      const normalized = { quantity: i.quantity, unitPrice: i.unitPrice, discountPct: i.discountPct ?? 0, taxPct: i.taxPct ?? 0 };
      return { input: i, ...computeLine(normalized, taxMethod) };
    });
    const grossAmount = lines.reduce((sum, l) => sum + l.base, 0);
    const discountAmount = lines.reduce((sum, l) => sum + l.discountAmt, 0);
    const taxAmount = lines.reduce((sum, l) => sum + l.taxAmt, 0);
    const amount = grossAmount - discountAmount + taxAmount;
    if (amount > bill.remaining) throw new BadRequestException("Debit note amount exceeds the bill's remaining balance");

    if (isReturn) {
      const levels = await this.prisma.stockLevel.findMany({
        where: { warehouseId: input.warehouseId, productId: { in: input.items.map((i) => i.productId) } },
      });
      const levelByProduct = new Map(levels.map((l) => [l.productId, l.quantity]));
      for (const item of input.items) {
        const available = levelByProduct.get(item.productId) ?? 0;
        if (available < item.quantity) {
          const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
          throw new BadRequestException(`Insufficient stock to return ${product?.name ?? item.productId} (have ${available}, need ${item.quantity})`);
        }
      }
    }

    const debitNoteNumber = await this.nextDebitNoteNumber();
    await this.prisma.$transaction(async (tx) => {
      await tx.debitNote.create({
        data: {
          debitNoteNumber,
          billId: input.billId,
          type,
          warehouseId: input.warehouseId,
          issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          linkedDocId: input.linkedDocId,
          taxId: input.taxId,
          settlementAccountId: input.settlementAccountId,
          taxMethod,
          supplierNotes: input.supplierNotes,
          termsConditions: input.termsConditions,
          internalNotes: input.internalNotes,
          grossAmount,
          discountAmount,
          taxAmount,
          amount,
          reason: input.reason,
          ...addressToColumns("partnerAddress", input.partnerAddress),
          organizationId,
          items: {
            create: lines.map((l) => ({
              productId: l.input.productId,
              quantity: l.input.quantity,
              uom: l.input.uom ?? "unit",
              unitPrice: l.input.unitPrice,
              discountPct: l.input.discountPct ?? 0,
              taxPct: l.input.taxPct ?? 0,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      if (isReturn) {
        for (const item of input.items) {
          await tx.stockLevel.update({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: input.warehouseId! } },
            data: { quantity: { decrement: item.quantity } },
          });
          await tx.stockLedgerEntry.create({
            data: {
              productId: item.productId,
              warehouseId: input.warehouseId!,
              type: StockMovementType.ADJUSTMENT,
              quantity: -item.quantity,
              reason: `Return ${debitNoteNumber} (${bill.billNumber})`,
              createdById: actorId,
              organizationId,
            },
          });
        }
      }
    });

    await this.supplierBillsService.recomputeStatus(input.billId);
    const row = await this.prisma.debitNote.findFirst({ where: { debitNoteNumber }, include: DEBIT_NOTE_INCLUDE });
    return toModel(row!);
  }

  async void(id: string, actorId: string, organizationId: string) {
    const existing = await this.prisma.debitNote.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundException("Debit note not found");
    if (existing.status === DebitNoteStatus.VOIDED) throw new BadRequestException("This debit note is already voided");

    await this.prisma.$transaction(async (tx) => {
      await tx.debitNote.update({ where: { id }, data: { status: DebitNoteStatus.VOIDED, voidedAt: new Date() } });

      if (existing.type === DebitNoteType.PURCHASE_RETURN && existing.warehouseId) {
        for (const item of existing.items) {
          await tx.stockLevel.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: existing.warehouseId } },
            create: { productId: item.productId, warehouseId: existing.warehouseId, quantity: item.quantity, organizationId },
            update: { quantity: { increment: item.quantity } },
          });
          await tx.stockLedgerEntry.create({
            data: {
              productId: item.productId,
              warehouseId: existing.warehouseId,
              type: StockMovementType.ADJUSTMENT,
              quantity: item.quantity,
              reason: `Void ${existing.debitNoteNumber}`,
              createdById: actorId,
              organizationId,
            },
          });
        }
      }
    });

    await this.supplierBillsService.recomputeStatus(existing.billId);
    const row = await this.prisma.debitNote.findUnique({ where: { id }, include: DEBIT_NOTE_INCLUDE });
    return toModel(row!);
  }
}
