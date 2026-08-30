import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateCategoryInput, UpdateCategoryInput } from "./dto/category.input";

const CATEGORY_INCLUDE = { parent: true } as const;

@Injectable()
export class CategoriesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  findAll() {
    return this.prisma.category.findMany({ include: CATEGORY_INCLUDE, orderBy: { createdAt: "asc" } });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id }, include: CATEGORY_INCLUDE });
  }

  create(input: CreateCategoryInput, organizationId: string) {
    return this.prisma.category.create({ data: { ...input, organizationId }, include: CATEGORY_INCLUDE });
  }

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    if (input.parentId === id) throw new BadRequestException("A category cannot be its own parent");
    return this.prisma.category.update({ where: { id }, data: input, include: CATEGORY_INCLUDE });
  }

  async delete(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    await this.prisma.category.delete({ where: { id } });
    return existing;
  }
}
