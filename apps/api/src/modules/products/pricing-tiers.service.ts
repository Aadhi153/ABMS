import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreatePricingTierInput, UpdatePricingTierInput } from "./dto/pricing-tier.input";

function toModel<T extends { discountPercent: unknown; minOrderValue: unknown }>(row: T) {
  return {
    ...row,
    discountPercent: Number(row.discountPercent),
    minOrderValue: row.minOrderValue == null ? null : Number(row.minOrderValue),
  };
}

@Injectable()
export class PricingTiersService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.pricingTier.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.pricingTier.findUnique({ where: { id } });
    return row ? toModel(row) : null;
  }

  async create(input: CreatePricingTierInput, organizationId: string) {
    const row = await this.prisma.pricingTier.create({ data: { ...input, organizationId } });
    return toModel(row);
  }

  async update(id: string, input: UpdatePricingTierInput) {
    const existing = await this.prisma.pricingTier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Pricing tier not found");
    const row = await this.prisma.pricingTier.update({ where: { id }, data: input });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.pricingTier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Pricing tier not found");
    await this.prisma.pricingTier.delete({ where: { id } });
    return toModel(existing);
  }
}
