import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InvoiceStatus, LedgerEntryType, SalesOrderStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { RecordPaymentInput } from "./dto/invoice.input";

const INVOICE_INCLUDE = { customer: true, salesOrder: true, payments: { orderBy: { paidAt: "asc" as const } } } as const;

function toModel<T extends {
  customer: { name: string };
  salesOrder: { orderNumber: string } | null;
  subtotal: unknown;
  taxAmount: unknown;
  discountAmount: unknown;
  total: unknown;
  dueDate: Date;
  status: InvoiceStatus;
  payments: Array<{ id: string; amount: unknown; method: string; reference: string | null; paidAt: Date }>;
}>(row: T) {
  const payments = row.payments.map((p) => ({ ...p, amount: Number(p.amount) }));
  const total = Number(row.total);
  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  let status: string = row.status;
  if (row.status !== InvoiceStatus.PAID) {
    if (amountPaid > 0 && amountPaid < total) status = InvoiceStatus.PARTIAL;
    else if (amountPaid <= 0 && row.dueDate.getTime() < Date.now()) status = InvoiceStatus.OVERDUE;
    else if (amountPaid <= 0) status = InvoiceStatus.UNPAID;
  }
  return {
    ...row,
    customerName: row.customer.name,
    orderNumber: row.salesOrder?.orderNumber ?? null,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.taxAmount),
    discountAmount: Number(row.discountAmount),
    total,
    amountPaid,
    payments,
    status,
  };
}

@Injectable()
export class InvoicesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.invoice.findMany({ include: INVOICE_INCLUDE, orderBy: { createdAt: "desc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextInvoiceNumber() {
    const count = await this.prisma.invoice.count();
    return `INV-${String(count + 1).padStart(4, "0")}`;
  }

  async generateFromOrder(salesOrderId: string, organizationId: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true, invoice: true },
    });
    if (!order) throw new NotFoundException("Sales order not found");
    if (order.status !== SalesOrderStatus.CONFIRMED && order.status !== SalesOrderStatus.DELIVERED) {
      throw new BadRequestException("Only confirmed orders can be invoiced");
    }
    if (order.invoice) throw new BadRequestException("This order already has an invoice");

    const taxRate = await this.prisma.taxRate.findFirst({ where: { isDefault: true } });
    const subtotal = order.items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
    const taxAmount = taxRate ? subtotal * (Number(taxRate.rate) / 100) : 0;
    const total = subtotal + taxAmount;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const invoiceNumber = await this.nextInvoiceNumber();

    const customer = await this.prisma.customer.findUnique({ where: { id: order.customerId } });
    const row = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        salesOrderId: order.id,
        customerId: order.customerId,
        status: InvoiceStatus.UNPAID,
        subtotal,
        taxAmount,
        total,
        dueDate,
        organizationId,
      },
      include: INVOICE_INCLUDE,
    });
    await this.prisma.ledgerEntry.create({
      data: {
        type: LedgerEntryType.RECEIVABLE,
        amount: total,
        description: `Invoice ${invoiceNumber} — ${customer?.name ?? "customer"}`,
        relatedInvoiceId: row.id,
        organizationId,
      },
    });
    return toModel(row);
  }

  async recordPayment(input: RecordPaymentInput, organizationId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: input.invoiceId }, include: { payments: true } });
    if (!invoice) throw new NotFoundException("Invoice not found");
    const paidSoFar = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (paidSoFar >= Number(invoice.total)) throw new BadRequestException("Invoice is already fully paid");

    await this.prisma.payment.create({
      data: { invoiceId: input.invoiceId, amount: input.amount, method: input.method, reference: input.reference, organizationId },
    });
    const newPaid = paidSoFar + input.amount;
    const status = newPaid >= Number(invoice.total) ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;
    await this.prisma.invoice.update({ where: { id: input.invoiceId }, data: { status } });
    return this.findById(input.invoiceId);
  }
}
