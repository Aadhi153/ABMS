import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateSupplierInput, UpdateSupplierInput } from "./dto/supplier.input";

function toModel<T extends { creditLimit: unknown; minOrderValue: unknown; _count: { purchaseOrders: number } }>(row: T) {
  const { _count, ...rest } = row;
  return {
    ...rest,
    creditLimit: rest.creditLimit == null ? null : Number(rest.creditLimit),
    minOrderValue: rest.minOrderValue == null ? null : Number(rest.minOrderValue),
    orderCount: _count.purchaseOrders,
  };
}

const SUPPLIER_INCLUDE = {
  contacts: true,
  addresses: true,
  bankAccounts: true,
  _count: { select: { purchaseOrders: true } },
} as const;

@Injectable()
export class SuppliersService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.supplier.findMany({
      include: SUPPLIER_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.supplier.findUnique({
      where: { id },
      include: SUPPLIER_INCLUDE,
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

  private async nextSupplierCode(organizationId: string) {
    const count = await this.prisma.supplier.count({ where: { organizationId } });
    return `SUPP-${String(count + 1).padStart(5, "0")}`;
  }

  async create(input: CreateSupplierInput, organizationId: string) {
    const { contacts, addresses, bankAccounts, ...rest } = input;
    const code = await this.nextSupplierCode(organizationId);
    const row = await this.prisma.supplier.create({
      data: {
        ...rest,
        code,
        organizationId,
        contacts: contacts?.length ? { create: contacts.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary ?? false })) } : undefined,
        addresses: addresses?.length ? { create: addresses.map((a) => ({ ...a })) } : undefined,
        bankAccounts: bankAccounts?.length ? { create: bankAccounts.map((b) => ({ ...b })) } : undefined,
      },
      include: SUPPLIER_INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: UpdateSupplierInput) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Supplier not found");
    const { contacts, addresses, bankAccounts, ...rest } = input;
    // Same full-replace approach as CustomersService.update — client always sends the
    // complete desired set for each child collection, so delete+recreate is simplest.
    const row = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...rest,
        contacts: contacts ? { deleteMany: {}, create: contacts.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary ?? false })) } : undefined,
        addresses: addresses ? { deleteMany: {}, create: addresses.map((a) => ({ ...a })) } : undefined,
        bankAccounts: bankAccounts ? { deleteMany: {}, create: bankAccounts.map((b) => ({ ...b })) } : undefined,
      },
      include: SUPPLIER_INCLUDE,
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
