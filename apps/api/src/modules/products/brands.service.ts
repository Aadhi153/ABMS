import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateBrandInput, UpdateBrandInput } from "./dto/brand.input";

const BRAND_INCLUDE = { _count: { select: { products: true } } } as const;

function toModel<T extends { _count: { products: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, productsCount: _count.products };
}

@Injectable()
export class BrandsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.brand.findMany({ include: BRAND_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.brand.findUnique({ where: { id }, include: BRAND_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateBrandInput, organizationId: string) {
    if (input.code) {
      const existing = await this.prisma.brand.findFirst({ where: { code: input.code } });
      if (existing) throw new ConflictException("A brand with this code already exists");
    }
    const row = await this.prisma.brand.create({ data: { ...input, organizationId }, include: BRAND_INCLUDE });
    return toModel(row);
  }

  async update(id: string, input: UpdateBrandInput) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Brand not found");
    if (input.code) {
      const codeOwner = await this.prisma.brand.findFirst({ where: { code: input.code, NOT: { id } } });
      if (codeOwner) throw new ConflictException("A brand with this code already exists");
    }
    const row = await this.prisma.brand.update({ where: { id }, data: input, include: BRAND_INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.brand.findUnique({ where: { id }, include: BRAND_INCLUDE });
    if (!existing) throw new NotFoundException("Brand not found");
    await this.prisma.brand.delete({ where: { id } });
    return toModel(existing);
  }
}
