import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateDiscountInput, UpdateDiscountInput } from "./dto/discount.input";

const DISCOUNT_INCLUDE = { category: true, brand: true } as const;

function toModel<T extends { value: unknown; minPurchaseAmount: unknown }>(row: T) {
  return {
    ...row,
    value: Number(row.value),
    minPurchaseAmount: row.minPurchaseAmount == null ? null : Number(row.minPurchaseAmount),
  };
}

@Injectable()
export class DiscountsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.discount.findMany({ include: DISCOUNT_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.discount.findUnique({ where: { id }, include: DISCOUNT_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateDiscountInput, organizationId: string) {
    const row = await this.prisma.discount.create({ data: { ...input, organizationId }, include: DISCOUNT_INCLUDE });
    return toModel(row);
  }

  async update(id: string, input: UpdateDiscountInput) {
    const existing = await this.prisma.discount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Discount not found");
    const row = await this.prisma.discount.update({ where: { id }, data: input, include: DISCOUNT_INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.discount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Discount not found");
    await this.prisma.discount.delete({ where: { id } });
    return toModel(existing);
  }
}
