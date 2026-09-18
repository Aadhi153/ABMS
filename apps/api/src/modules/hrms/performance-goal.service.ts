import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { GoalStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreatePerformanceGoalInput } from "./dto/performance-goal.input";

const GOAL_INCLUDE = {
  employee: { include: { branch: true } },
  kpiTemplate: true,
  target: true,
  assignedBy: true,
} as const;

function toModel<
  T extends {
    employee: { firstName: string; lastName: string; branchId: string | null; branch: { name: string } | null };
    kpiTemplate: { title: string };
    target: { targetName: string } | null;
    assignedBy: { name: string };
    weightagePct: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    branchId: row.employee.branchId,
    branchName: row.employee.branch?.name ?? null,
    kpiTemplateTitle: row.kpiTemplate.title,
    targetName: row.target?.targetName ?? null,
    assignedByName: row.assignedBy.name,
    weightagePct: Number(row.weightagePct),
  };
}

@Injectable()
export class PerformanceGoalService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: { employeeId?: string; branchId?: string; period?: string; status?: string }) {
    const rows = await this.prisma.performanceGoal.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.branchId ? { employee: { branchId: filter.branchId } } : {}),
        ...(filter?.period ? { period: filter.period } : {}),
        ...(filter?.status ? { status: filter.status as never } : {}),
      },
      include: GOAL_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toModel);
  }

  async create(input: CreatePerformanceGoalInput, organizationId: string, assignedById: string) {
    const existingTotal = await this.prisma.performanceGoal.aggregate({
      where: { employeeId: input.employeeId, period: input.period, status: GoalStatus.ACTIVE },
      _sum: { weightagePct: true },
    });
    const currentTotal = Number(existingTotal._sum.weightagePct ?? 0);
    if (currentTotal + input.weightagePct > 100) {
      throw new BadRequestException(
        `Weightage would exceed 100% for this employee/cycle (currently ${currentTotal}%, adding ${input.weightagePct}%)`,
      );
    }

    const row = await this.prisma.performanceGoal.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        kpiTemplateId: input.kpiTemplateId,
        targetId: input.targetId,
        period: input.period,
        weightagePct: input.weightagePct,
        assignedById,
      },
      include: GOAL_INCLUDE,
    });
    return toModel(row);
  }

  async findById(id: string) {
    const row = await this.prisma.performanceGoal.findUnique({ where: { id }, include: GOAL_INCLUDE });
    return row ? toModel(row) : null;
  }

  async cancel(id: string) {
    const existing = await this.prisma.performanceGoal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Goal not found");
    const row = await this.prisma.performanceGoal.update({ where: { id }, data: { status: GoalStatus.CANCELLED }, include: GOAL_INCLUDE });
    return toModel(row);
  }
}
