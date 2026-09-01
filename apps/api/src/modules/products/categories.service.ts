import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateCategoryInput, UpdateCategoryInput } from "./dto/category.input";

const CATEGORY_INCLUDE = { parent: true, _count: { select: { products: true, children: true } } } as const;

function toModel<T extends { _count: { products: number; children: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, productsCount: _count.products, subcategoriesCount: _count.children };
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.category.findMany({ include: CATEGORY_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.category.findUnique({ where: { id }, include: CATEGORY_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateCategoryInput, organizationId: string) {
    const row = await this.prisma.category.create({ data: { ...input, organizationId }, include: CATEGORY_INCLUDE });
    return toModel(row);
  }

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    if (input.parentId === id) throw new BadRequestException("A category cannot be its own parent");
    const row = await this.prisma.category.update({ where: { id }, data: input, include: CATEGORY_INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id }, include: CATEGORY_INCLUDE });
    if (!existing) throw new NotFoundException("Category not found");
    await this.prisma.category.delete({ where: { id } });
    return toModel(existing);
  }
}
