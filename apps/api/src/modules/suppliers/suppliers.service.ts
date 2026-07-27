import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateSupplierInput, UpdateSupplierInput } from "./dto/supplier.input";

function toModel<T extends { _count: { purchaseOrders: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, orderCount: _count.purchaseOrders };
}

@Injectable()
export class SuppliersService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.supplier.findMany({
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    return row ? toModel(row) : null;
  }

  async purchaseHistory(supplierId: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((o) => ({
      id: o.id,
      poNumber: o.poNumber,
      status: o.status,
      total: o.items.reduce((sum, i) => sum + i.quantity * Number(i.unitCost), 0),
      createdAt: o.createdAt,
    }));
  }

  create(input: CreateSupplierInput, organizationId: string) {
    return this.prisma.supplier
      .create({ data: { ...input, organizationId }, include: { _count: { select: { purchaseOrders: true } } } })
      .then(toModel);
  }

  async update(id: string, input: UpdateSupplierInput) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Supplier not found");
    const row = await this.prisma.supplier.update({
      where: { id },
      data: input,
      include: { _count: { select: { purchaseOrders: true } } },
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Supplier not found");
    try {
      await this.prisma.supplier.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException("Cannot delete supplier — it still has linked orders or bills.");
      }
      throw err;
    }
    return existing;
  }
}
