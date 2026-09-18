import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateKpiTemplateInput } from "./dto/kpi-template.input";

const KPI_TEMPLATE_INCLUDE = {
  targets: { orderBy: { sortOrder: "asc" as const } },
} as const;

function toModel<T extends { targets: Array<{ weightagePct: unknown }> }>(row: T) {
  return {
    ...row,
    targets: row.targets.map((t) => ({ ...t, weightagePct: Number(t.weightagePct) })),
  };
}

@Injectable()
export class KpiTemplateService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.kpiTemplate.findMany({
      include: KPI_TEMPLATE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.kpiTemplate.findUnique({ where: { id }, include: KPI_TEMPLATE_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateKpiTemplateInput, organizationId: string) {
    const row = await this.prisma.kpiTemplate.create({
      data: {
        organizationId,
        title: input.title,
        description: input.description,
        department: input.department,
        designation: input.designation,
        targets: {
          create: input.targets.map((t, i) => ({
            weightagePct: t.weightagePct,
            targetName: t.targetName,
            targetValueDefinition: t.targetValueDefinition,
            incentiveName: t.incentiveName,
            sortOrder: i,
          })),
        },
      },
      include: KPI_TEMPLATE_INCLUDE,
    });
    return toModel(row);
  }

  async setActive(id: string, active: boolean) {
    const existing = await this.prisma.kpiTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("KPI template not found");
    const row = await this.prisma.kpiTemplate.update({ where: { id }, data: { active }, include: KPI_TEMPLATE_INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.kpiTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("KPI template not found");
    const goalCount = await this.prisma.performanceGoal.count({ where: { kpiTemplateId: id } });
    if (goalCount > 0) throw new BadRequestException("This KPI template has goals assigned and cannot be deleted");
    await this.prisma.kpiTemplate.delete({ where: { id } });
    return existing;
  }
}
