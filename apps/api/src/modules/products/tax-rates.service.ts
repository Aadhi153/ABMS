import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateTaxRateInput, UpdateTaxRateInput } from "./dto/tax-rate.input";

function toModel<T extends { rate: unknown }>(row: T) {
  return { ...row, rate: Number(row.rate) };
}

@Injectable()
export class TaxRatesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.taxRate.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.taxRate.findUnique({ where: { id } });
    return row ? toModel(row) : null;
  }

  private async clearDefault() {
    await this.prisma.taxRate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  async create(input: CreateTaxRateInput, organizationId: string) {
    if (input.isDefault) await this.clearDefault();
    const row = await this.prisma.taxRate.create({ data: { ...input, organizationId } });
    return toModel(row);
  }

  async update(id: string, input: UpdateTaxRateInput) {
    const existing = await this.prisma.taxRate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tax rate not found");
    if (input.isDefault) await this.clearDefault();
    const row = await this.prisma.taxRate.update({ where: { id }, data: input });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.taxRate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tax rate not found");
    await this.prisma.taxRate.delete({ where: { id } });
    return toModel(existing);
  }
}
