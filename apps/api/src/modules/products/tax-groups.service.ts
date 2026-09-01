import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateTaxGroupInput, UpdateTaxGroupInput } from "./dto/tax-group.input";

const TAX_GROUP_INCLUDE = { taxRates: true } as const;

function toModel<T extends { taxRates: Array<{ rate: unknown }> }>(row: T) {
  const taxRates = row.taxRates.map((r) => ({ ...r, rate: Number(r.rate) }));
  const totalRate = taxRates.reduce((sum, r) => sum + r.rate, 0);
  return { ...row, taxRates, totalRate };
}

@Injectable()
export class TaxGroupsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.taxGroup.findMany({ include: TAX_GROUP_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.taxGroup.findUnique({ where: { id }, include: TAX_GROUP_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateTaxGroupInput, organizationId: string) {
    const row = await this.prisma.taxGroup.create({
      data: {
        name: input.name,
        code: input.code,
        active: input.active,
        organizationId,
        taxRates: { connect: input.taxRateIds.map((id) => ({ id })) },
      },
      include: TAX_GROUP_INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: UpdateTaxGroupInput) {
    const existing = await this.prisma.taxGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tax group not found");
    const row = await this.prisma.taxGroup.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        active: input.active,
        ...(input.taxRateIds ? { taxRates: { set: input.taxRateIds.map((id) => ({ id })) } } : {}),
      },
      include: TAX_GROUP_INCLUDE,
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.taxGroup.findUnique({ where: { id }, include: TAX_GROUP_INCLUDE });
    if (!existing) throw new NotFoundException("Tax group not found");
    await this.prisma.taxGroup.delete({ where: { id } });
    return toModel(existing);
  }
}
