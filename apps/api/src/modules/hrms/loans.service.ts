import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { LoanStatus, RepaymentStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateLoanInput } from "./dto/loan.input";

const LOAN_INCLUDE = {
  employee: true,
  approvedBy: true,
  repayments: { orderBy: { installmentNumber: "asc" as const } },
} as const;

function toModel<
  T extends {
    employee: { firstName: string; lastName: string };
    approvedBy: { name: string } | null;
    principalAmount: unknown;
    interestRatePct: unknown;
    emiAmount: unknown;
    repayments: Array<{ amount: unknown; status: string }>;
  },
>(row: T) {
  const outstandingAmount = row.repayments
    .filter((r) => r.status === RepaymentStatus.SCHEDULED)
    .reduce((sum, r) => sum + Number(r.amount), 0);
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    approvedByName: row.approvedBy?.name ?? null,
    principalAmount: Number(row.principalAmount),
    interestRatePct: Number(row.interestRatePct),
    emiAmount: Number(row.emiAmount),
    outstandingAmount: Math.round(outstandingAmount * 100) / 100,
    repayments: row.repayments.map((r) => ({ ...r, amount: Number(r.amount) })),
  };
}

@Injectable()
export class LoansService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: { employeeId?: string; status?: string }) {
    const rows = await this.prisma.employeeLoan.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.status ? { status: filter.status as never } : {}),
      },
      include: LOAN_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.employeeLoan.findUnique({ where: { id }, include: LOAN_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextLoanNumber() {
    const count = await this.prisma.employeeLoan.count();
    return `LOAN-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateLoanInput, organizationId: string) {
    const loanNumber = await this.nextLoanNumber();
    const interestRatePct = input.interestRatePct ?? 0;
    const totalPayable = Math.round(input.principalAmount * (1 + interestRatePct / 100) * 100) / 100;
    const emiAmount = Math.round((totalPayable / input.tenureMonths) * 100) / 100;

    const row = await this.prisma.employeeLoan.create({
      data: {
        organizationId,
        loanNumber,
        employeeId: input.employeeId,
        loanType: input.loanType,
        principalAmount: input.principalAmount,
        interestRatePct,
        tenureMonths: input.tenureMonths,
        emiAmount,
        startDate: input.startDate,
        status: LoanStatus.PENDING,
        reason: input.reason,
        repayments: {
          create: Array.from({ length: input.tenureMonths }, (_, i) => {
            const dueDate = new Date(input.startDate);
            dueDate.setMonth(dueDate.getMonth() + i + 1);
            const isLast = i === input.tenureMonths - 1;
            const amountSoFar = emiAmount * i;
            const amount = isLast ? Math.round((totalPayable - amountSoFar) * 100) / 100 : emiAmount;
            return { installmentNumber: i + 1, dueDate, amount, status: RepaymentStatus.SCHEDULED };
          }),
        },
      },
      include: LOAN_INCLUDE,
    });
    return toModel(row);
  }

  async approve(id: string, approverId: string) {
    const existing = await this.prisma.employeeLoan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Loan not found");
    if (existing.status !== LoanStatus.PENDING) throw new BadRequestException("Only pending loans can be approved");
    const row = await this.prisma.employeeLoan.update({
      where: { id },
      data: { status: LoanStatus.ACTIVE, approvedById: approverId, approvedAt: new Date() },
      include: LOAN_INCLUDE,
    });
    return toModel(row);
  }

  async reject(id: string, approverId: string) {
    const existing = await this.prisma.employeeLoan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Loan not found");
    if (existing.status !== LoanStatus.PENDING) throw new BadRequestException("Only pending loans can be rejected");
    const row = await this.prisma.employeeLoan.update({
      where: { id },
      data: { status: LoanStatus.REJECTED, approvedById: approverId, approvedAt: new Date() },
      include: LOAN_INCLUDE,
    });
    return toModel(row);
  }

  async close(id: string) {
    const existing = await this.prisma.employeeLoan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Loan not found");
    await this.prisma.loanRepayment.updateMany({
      where: { loanId: id, status: RepaymentStatus.SCHEDULED },
      data: { status: RepaymentStatus.SKIPPED },
    });
    const row = await this.prisma.employeeLoan.update({ where: { id }, data: { status: LoanStatus.CLOSED }, include: LOAN_INCLUDE });
    return toModel(row);
  }

  async markRepaymentPaid(repaymentId: string) {
    const repayment = await this.prisma.loanRepayment.findUnique({ where: { id: repaymentId } });
    if (!repayment) throw new NotFoundException("Repayment not found");
    await this.prisma.loanRepayment.update({
      where: { id: repaymentId },
      data: { status: RepaymentStatus.PAID, paidAt: new Date() },
    });
    const remaining = await this.prisma.loanRepayment.count({
      where: { loanId: repayment.loanId, status: RepaymentStatus.SCHEDULED },
    });
    if (remaining === 0) {
      await this.prisma.employeeLoan.update({ where: { id: repayment.loanId }, data: { status: LoanStatus.CLOSED } });
    }
    const row = await this.prisma.employeeLoan.findUnique({ where: { id: repayment.loanId }, include: LOAN_INCLUDE });
    return toModel(row!);
  }

  async delete(id: string) {
    const existing = await this.prisma.employeeLoan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Loan not found");
    if (existing.status !== LoanStatus.PENDING) throw new BadRequestException("Only pending loans can be deleted");
    await this.prisma.employeeLoan.delete({ where: { id } });
    return existing;
  }
}
