import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateBrandInput, UpdateBrandInput } from "./dto/brand.input";

@Injectable()
export class BrandsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  findAll() {
    return this.prisma.brand.findMany({ orderBy: { createdAt: "asc" } });
  }

  findById(id: string) {
    return this.prisma.brand.findUnique({ where: { id } });
  }

  create(input: CreateBrandInput, organizationId: string) {
    return this.prisma.brand.create({ data: { ...input, organizationId } });
  }

  async update(id: string, input: UpdateBrandInput) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Brand not found");
    return this.prisma.brand.update({ where: { id }, data: input });
  }

  async delete(id: string) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Brand not found");
    await this.prisma.brand.delete({ where: { id } });
    return existing;
  }
}
