import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InvoiceStatus, LedgerEntryType, SupplierBillStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateExpenseInput } from "./dto/expense.input";

function emptyAging() {
  return { current: 0, days31to60: 0, days60plus: 0 };
}

function bucketFor(dueDate: Date) {
  const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
  if (daysPastDue <= 30) return "current" as const;
  if (daysPastDue <= 60) return "days31to60" as const;
  return "days60plus" as const;
}

@Injectable()
export class AccountsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async ledger() {
    const rows = await this.prisma.ledgerEntry.findMany({ orderBy: { postedAt: "desc" } });
    return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
  }

  async bankAccounts() {
    const rows = await this.prisma.bankAccount.findMany({ orderBy: { isDefault: "desc" } });
    return rows;
  }

  async receivables() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { not: InvoiceStatus.PAID } },
      include: { customer: true, payments: true },
    });
    const byCustomer = new Map<string, { customerId: string; customerName: string; totalOwed: number; aging: ReturnType<typeof emptyAging>; invoiceCount: number }>();
    for (const inv of invoices) {
      const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(inv.total) - paid;
      if (remaining <= 0) continue;
      const entry = byCustomer.get(inv.customerId) ?? {
        customerId: inv.customerId,
        customerName: inv.customer.name,
        totalOwed: 0,
        aging: emptyAging(),
        invoiceCount: 0,
      };
      entry.totalOwed += remaining;
      entry.aging[bucketFor(inv.dueDate)] += remaining;
      entry.invoiceCount += 1;
      byCustomer.set(inv.customerId, entry);
    }
    return [...byCustomer.values()].sort((a, b) => b.totalOwed - a.totalOwed);
  }

  async payables() {
    const bills = await this.prisma.supplierBill.findMany({
      where: { status: { not: SupplierBillStatus.PAID } },
      include: { supplier: true },
    });
    const bySupplier = new Map<string, { supplierId: string; supplierName: string; totalOwed: number; aging: ReturnType<typeof emptyAging>; billCount: number }>();
    for (const bill of bills) {
      const entry = bySupplier.get(bill.supplierId) ?? {
        supplierId: bill.supplierId,
        supplierName: bill.supplier.name,
        totalOwed: 0,
        aging: emptyAging(),
        billCount: 0,
      };
      const amount = Number(bill.amount);
      entry.totalOwed += amount;
      entry.aging[bucketFor(bill.dueDate)] += amount;
      entry.billCount += 1;
      bySupplier.set(bill.supplierId, entry);
    }
    return [...bySupplier.values()].sort((a, b) => b.totalOwed - a.totalOwed);
  }

  async expenses() {
    const rows = await this.prisma.expense.findMany({ include: { createdBy: true }, orderBy: { date: "desc" } });
    return rows.map((r) => ({ ...r, amount: Number(r.amount), createdByName: r.createdBy.name }));
  }

  async createExpense(input: CreateExpenseInput, actorId: string, organizationId: string) {
    const expense = await this.prisma.expense.create({
      data: {
        category: input.category,
        amount: input.amount,
        date: new Date(input.date),
        notes: input.notes,
        createdById: actorId,
        organizationId,
      },
      include: { createdBy: true },
    });
    await this.prisma.ledgerEntry.create({
      data: {
        type: LedgerEntryType.EXPENSE,
        amount: input.amount,
        description: `Expense — ${input.category}`,
        relatedExpenseId: expense.id,
        organizationId,
      },
    });
    return { ...expense, amount: Number(expense.amount), createdByName: expense.createdBy.name };
  }

  async deleteExpense(id: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Expense not found");
    await this.prisma.ledgerEntry.deleteMany({ where: { relatedExpenseId: id } });
    await this.prisma.expense.delete({ where: { id } });
    return existing;
  }

  async pnl() {
    const entries = await this.prisma.ledgerEntry.findMany();
    const sumFor = (type: LedgerEntryType) => entries.filter((e) => e.type === type).reduce((sum, e) => sum + Number(e.amount), 0);
    const revenue = sumFor(LedgerEntryType.RECEIVABLE);
    const costOfGoods = sumFor(LedgerEntryType.PAYABLE);
    const operatingExpenses = sumFor(LedgerEntryType.EXPENSE);
    return { revenue, costOfGoods, operatingExpenses, netProfit: revenue - costOfGoods - operatingExpenses };
  }
}
