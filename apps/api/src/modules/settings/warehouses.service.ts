import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateWarehouseInput, UpdateWarehouseInput } from "./dto/warehouse.input";

@Injectable()
export class WarehousesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  findAll() {
    return this.prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } });
  }

  findById(id: string) {
    return this.prisma.warehouse.findUnique({ where: { id } });
  }

  create(input: CreateWarehouseInput, organizationId: string) {
    return this.prisma.warehouse.create({ data: { ...input, organizationId } });
  }

  async update(id: string, input: UpdateWarehouseInput) {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException("Warehouse not found");
    return this.prisma.warehouse.update({ where: { id }, data: input });
  }
}
