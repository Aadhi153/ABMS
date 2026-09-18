import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateIncentiveMatrixRuleInput } from "./dto/incentive-matrix-rule.input";

function toModel<T extends { minScore: unknown; maxScore: unknown; bonusAmount: unknown; incrementPct: unknown }>(row: T) {
  return {
    ...row,
    minScore: Number(row.minScore),
    maxScore: Number(row.maxScore),
    bonusAmount: Number(row.bonusAmount),
    incrementPct: row.incrementPct === null || row.incrementPct === undefined ? null : Number(row.incrementPct),
  };
}

@Injectable()
export class IncentiveMatrixRuleService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.incentiveMatrixRule.findMany({ orderBy: { minScore: "asc" } });
    return rows.map(toModel);
  }

  async findMatching(score: number) {
    const rows = await this.prisma.incentiveMatrixRule.findMany({
      where: { minScore: { lte: score }, maxScore: { gte: score } },
      orderBy: { minScore: "desc" },
    });
    return rows.map(toModel)[0] ?? null;
  }

  async create(input: CreateIncentiveMatrixRuleInput, organizationId: string) {
    const row = await this.prisma.incentiveMatrixRule.create({
      data: {
        organizationId,
        minScore: input.minScore,
        maxScore: input.maxScore,
        bonusAmount: input.bonusAmount,
        incrementPct: input.incrementPct,
      },
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.incentiveMatrixRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Incentive matrix rule not found");
    await this.prisma.incentiveMatrixRule.delete({ where: { id } });
    return toModel(existing);
  }
}
