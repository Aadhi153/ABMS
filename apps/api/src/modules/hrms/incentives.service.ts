import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { IncentiveSource, IncentiveStatus, IncentiveType } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateIncentiveInput, CreateManualIncentiveInput } from "./dto/incentive.input";

const INCENTIVE_INCLUDE = {
  employee: true,
  approvedBy: true,
  appraisal: true,
} as const;

function monthLabel(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toModel<
  T extends {
    employee: { firstName: string; lastName: string };
    approvedBy: { name: string } | null;
    appraisal: { reviewPeriodStart: Date; rating: number | null } | null;
    amount: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    approvedByName: row.approvedBy?.name ?? null,
    appraisalPeriod: row.appraisal ? monthLabel(row.appraisal.reviewPeriodStart) : null,
    finalScore: row.appraisal?.rating ?? null,
    amount: Number(row.amount),
  };
}

@Injectable()
export class IncentivesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: { employeeId?: string; status?: string }) {
    const rows = await this.prisma.incentive.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.status ? { status: filter.status as never } : {}),
      },
      include: INCENTIVE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.incentive.findUnique({ where: { id }, include: INCENTIVE_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateIncentiveInput, organizationId: string) {
    const row = await this.prisma.incentive.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        type: input.type,
        title: input.title,
        amount: input.amount,
        reason: input.reason,
        awardDate: input.awardDate,
        status: IncentiveStatus.PENDING,
      },
      include: INCENTIVE_INCLUDE,
    });
    return toModel(row);
  }

  async createManual(input: CreateManualIncentiveInput, organizationId: string) {
    const count = input.employeeIds.length;
    const perEmployeeAmount = input.giveFullAmountToEach
      ? input.amount
      : Math.round((input.amount / count) * 100) / 100;
    const awardDate = new Date();

    const rows = await this.prisma.$transaction(
      input.employeeIds.map((employeeId) =>
        this.prisma.incentive.create({
          data: {
            organizationId,
            employeeId,
            type: IncentiveType.OTHER,
            source: IncentiveSource.MANUAL,
            title: "Manual Incentive",
            amount: perEmployeeAmount,
            reason: input.reason,
            awardDate,
            status: IncentiveStatus.PENDING,
          },
          include: INCENTIVE_INCLUDE,
        }),
      ),
    );
    return rows.map(toModel);
  }

  async approve(id: string, approverId: string) {
    const existing = await this.prisma.incentive.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Incentive not found");
    if (existing.status !== IncentiveStatus.PENDING) throw new BadRequestException("Only pending incentives can be approved");
    const row = await this.prisma.incentive.update({
      where: { id },
      data: { status: IncentiveStatus.APPROVED, approvedById: approverId, approvedAt: new Date() },
      include: INCENTIVE_INCLUDE,
    });
    return toModel(row);
  }

  async reject(id: string, approverId: string) {
    const existing = await this.prisma.incentive.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Incentive not found");
    if (existing.status !== IncentiveStatus.PENDING) throw new BadRequestException("Only pending incentives can be rejected");
    const row = await this.prisma.incentive.update({
      where: { id },
      data: { status: IncentiveStatus.REJECTED, approvedById: approverId, approvedAt: new Date() },
      include: INCENTIVE_INCLUDE,
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.incentive.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Incentive not found");
    if (existing.status === IncentiveStatus.PAID) throw new BadRequestException("Paid incentives cannot be deleted");
    await this.prisma.incentive.delete({ where: { id } });
    return existing;
  }
}
