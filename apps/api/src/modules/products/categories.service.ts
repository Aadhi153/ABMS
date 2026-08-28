import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateCategoryInput, UpdateCategoryInput } from "./dto/category.input";

@Injectable()
export class CategoriesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { createdAt: "asc" } });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(input: CreateCategoryInput, organizationId: string) {
    return this.prisma.category.create({ data: { ...input, organizationId } });
  }

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    return this.prisma.category.update({ where: { id }, data: input });
  }

  async delete(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    await this.prisma.category.delete({ where: { id } });
    return existing;
  }
}
