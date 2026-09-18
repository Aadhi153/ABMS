import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeStatus, ReviewStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreatePerformanceReviewInput, GenerateAppraisalCycleInput } from "./dto/performance.input";

const REVIEW_INCLUDE = {
  employee: true,
  reviewer: true,
} as const;

function monthLabel(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toModel<
  T extends { employee: { firstName: string; lastName: string }; reviewer: { name: string }; reviewPeriodStart: Date; selfScore: unknown },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    reviewerName: row.reviewer.name,
    period: monthLabel(row.reviewPeriodStart),
    selfScore: row.selfScore === null || row.selfScore === undefined ? null : Number(row.selfScore),
  };
}

function periodBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

@Injectable()
export class PerformanceService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: { employeeId?: string; status?: string }) {
    const rows = await this.prisma.performanceReview.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.status ? { status: filter.status as never } : {}),
      },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.performanceReview.findUnique({ where: { id }, include: REVIEW_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreatePerformanceReviewInput, organizationId: string, reviewerId: string) {
    const row = await this.prisma.performanceReview.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        reviewerId,
        reviewPeriodStart: input.reviewPeriodStart,
        reviewPeriodEnd: input.reviewPeriodEnd,
        rating: input.rating,
        selfScore: input.selfScore,
        goals: input.goals,
        achievements: input.achievements,
        areasOfImprovement: input.areasOfImprovement,
        managerComments: input.managerComments,
        employeeComments: input.employeeComments,
        status: ReviewStatus.DRAFT,
      },
      include: REVIEW_INCLUDE,
    });
    return toModel(row);
  }

  async generateCycle(input: GenerateAppraisalCycleInput, organizationId: string, reviewerId: string) {
    const { start, end } = periodBounds(input.period);
    const employeeIds =
      input.employeeIds ??
      (await this.prisma.employee.findMany({ where: { status: EmployeeStatus.ACTIVE }, select: { id: true } })).map((e) => e.id);

    const existing = await this.prisma.performanceReview.findMany({
      where: { employeeId: { in: employeeIds }, reviewPeriodStart: start },
      select: { employeeId: true },
    });
    const existingIds = new Set(existing.map((r) => r.employeeId));
    const toCreate = employeeIds.filter((id) => !existingIds.has(id));

    if (toCreate.length === 0) {
      return [];
    }

    await this.prisma.performanceReview.createMany({
      data: toCreate.map((employeeId) => ({
        organizationId,
        employeeId,
        reviewerId,
        reviewPeriodStart: start,
        reviewPeriodEnd: end,
        status: ReviewStatus.DRAFT,
      })),
    });

    const rows = await this.prisma.performanceReview.findMany({
      where: { employeeId: { in: toCreate }, reviewPeriodStart: start },
      include: REVIEW_INCLUDE,
    });
    return rows.map(toModel);
  }

  async update(id: string, input: CreatePerformanceReviewInput) {
    const existing = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Performance review not found");
    if (existing.status !== ReviewStatus.DRAFT) throw new BadRequestException("Only draft reviews can be edited");
    const row = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        reviewPeriodStart: input.reviewPeriodStart,
        reviewPeriodEnd: input.reviewPeriodEnd,
        rating: input.rating,
        selfScore: input.selfScore,
        goals: input.goals,
        achievements: input.achievements,
        areasOfImprovement: input.areasOfImprovement,
        managerComments: input.managerComments,
        employeeComments: input.employeeComments,
      },
      include: REVIEW_INCLUDE,
    });
    return toModel(row);
  }

  async submit(id: string) {
    const existing = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Performance review not found");
    if (existing.status !== ReviewStatus.DRAFT) throw new BadRequestException("Only draft reviews can be submitted");
    if (existing.rating === null) throw new BadRequestException("A final score is required before submitting");
    const row = await this.prisma.performanceReview.update({
      where: { id },
      data: { status: ReviewStatus.SUBMITTED, submittedAt: new Date() },
      include: REVIEW_INCLUDE,
    });
    return toModel(row);
  }

  async acknowledge(id: string) {
    const existing = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Performance review not found");
    if (existing.status !== ReviewStatus.SUBMITTED) throw new BadRequestException("Only submitted reviews can be acknowledged");
    const row = await this.prisma.performanceReview.update({
      where: { id },
      data: { status: ReviewStatus.ACKNOWLEDGED, acknowledgedAt: new Date() },
      include: REVIEW_INCLUDE,
    });
    return toModel(row);
  }

  async close(id: string) {
    const existing = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Performance review not found");
    const row = await this.prisma.performanceReview.update({
      where: { id },
      data: { status: ReviewStatus.CLOSED },
      include: REVIEW_INCLUDE,
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Performance review not found");
    if (existing.status !== ReviewStatus.DRAFT) throw new BadRequestException("Only draft reviews can be deleted");
    await this.prisma.performanceReview.delete({ where: { id } });
    return existing;
  }
}
