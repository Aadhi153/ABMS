import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { QuoteStatus, QuoteTaxMethod } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateQuoteInput, QuoteItemInput } from "./dto/quote.input";

const QUOTE_INCLUDE = {
  customer: true,
  createdBy: true,
  priceList: true,
  items: { include: { product: true, warehouse: true }, orderBy: { sortOrder: "asc" as const } },
} as const;

function computeLine(item: { quantity: number; unitPrice: number; discountPct: number; taxPct: number }, taxMethod: QuoteTaxMethod) {
  const gross = item.quantity * item.unitPrice;
  const base = taxMethod === QuoteTaxMethod.INCLUSIVE ? gross / (1 + item.taxPct / 100) : gross;
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
  };
}

@Injectable()
export class QuotesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.quote.findMany({ include: QUOTE_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.quote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextQuoteNumber() {
    const count = await this.prisma.quote.count();
    return `QT-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateQuoteInput, actorId: string, organizationId: string) {
    for (const item of input.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
    }
    const taxMethod = input.taxMethod ?? QuoteTaxMethod.EXCLUSIVE;
    const lines = input.items.map((i: QuoteItemInput) => {
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

    const quoteNumber = await this.nextQuoteNumber();
    const row = await this.prisma.quote.create({
      data: {
        quoteNumber,
        customerId: input.customerId,
        validUntil: input.validUntil,
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
      include: QUOTE_INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: CreateQuoteInput) {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Quote not found");
    if (existing.status !== QuoteStatus.DRAFT) throw new BadRequestException("Only draft quotes can be edited");

    for (const item of input.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
    }
    const taxMethod = input.taxMethod ?? QuoteTaxMethod.EXCLUSIVE;
    const lines = input.items.map((i: QuoteItemInput) => {
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

    const row = await this.prisma.quote.update({
      where: { id },
      data: {
        customerId: input.customerId,
        validUntil: input.validUntil,
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
        items: {
          deleteMany: {},
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
      include: QUOTE_INCLUDE,
    });
    return toModel(row);
  }

  async send(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException("Quote not found");
    if (quote.status !== QuoteStatus.DRAFT) throw new BadRequestException("Only draft quotes can be sent");
    await this.prisma.quote.update({ where: { id }, data: { status: QuoteStatus.SENT } });
    return this.findById(id);
  }

  async delete(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException("Quote not found");
    if (quote.status !== QuoteStatus.DRAFT) throw new BadRequestException("Only draft quotes can be deleted");
    await this.prisma.quote.delete({ where: { id } });
    return quote;
  }
}
