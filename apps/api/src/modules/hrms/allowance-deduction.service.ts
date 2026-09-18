import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { AllowanceDeductionFilterInput, CreateAllowanceDeductionInput } from "./dto/allowance-deduction.input";

const ENTRY_INCLUDE = {
  employee: true,
  createdBy: true,
} as const;

function toModel<
  T extends {
    employee: { firstName: string; lastName: string; employeeCode: string; department: string };
    createdBy: { name: string } | null;
    amount: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    employeeCode: row.employee.employeeCode,
    department: row.employee.department,
    createdByName: row.createdBy?.name ?? null,
    amount: Number(row.amount),
  };
}

function toDateOnly(date: Date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

@Injectable()
export class AllowanceDeductionService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: AllowanceDeductionFilterInput) {
    const rows = await this.prisma.allowanceDeductionEntry.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.type ? { type: filter.type as never } : {}),
        ...(filter?.department ? { employee: { department: filter.department } } : {}),
        ...(filter?.month && filter?.year
          ? { date: { gte: new Date(filter.year, filter.month - 1, 1), lt: new Date(filter.year, filter.month, 1) } }
          : {}),
      },
      include: ENTRY_INCLUDE,
      orderBy: { date: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.allowanceDeductionEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
    return row ? toModel(row) : null;
  }

  async summary(month: number, year: number) {
    const rows = await this.prisma.allowanceDeductionEntry.findMany({
      where: { date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
    });
    let totalAllowances = 0;
    let totalDeductions = 0;
    for (const row of rows) {
      const amount = Number(row.amount);
      if (row.type === "ALLOWANCE") totalAllowances += amount;
      else totalDeductions += amount;
    }
    return { totalAllowances, totalDeductions, netAdjustment: totalAllowances - totalDeductions, totalRecords: rows.length };
  }

  async create(input: CreateAllowanceDeductionInput, organizationId: string, createdById: string) {
    const row = await this.prisma.allowanceDeductionEntry.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        type: input.type,
        date: toDateOnly(input.date),
        amount: input.amount,
        paymentMode: input.paymentMode,
        remarks: input.remarks,
        createdById,
      },
      include: ENTRY_INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: CreateAllowanceDeductionInput) {
    const existing = await this.prisma.allowanceDeductionEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Entry not found");
    const row = await this.prisma.allowanceDeductionEntry.update({
      where: { id },
      data: {
        employeeId: input.employeeId,
        type: input.type,
        date: toDateOnly(input.date),
        amount: input.amount,
        paymentMode: input.paymentMode,
        remarks: input.remarks,
      },
      include: ENTRY_INCLUDE,
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.allowanceDeductionEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
    if (!existing) throw new NotFoundException("Entry not found");
    await this.prisma.allowanceDeductionEntry.delete({ where: { id } });
    return toModel(existing);
  }
}
