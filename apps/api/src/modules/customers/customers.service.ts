import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateCustomerInput, UpdateCustomerInput } from "./dto/customer.input";

function toModel<T extends { creditLimit: unknown; _count: { salesOrders: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, creditLimit: rest.creditLimit == null ? null : Number(rest.creditLimit), orderCount: _count.salesOrders };
}

@Injectable()
export class CustomersService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.customer.findMany({
      include: { _count: { select: { salesOrders: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { salesOrders: true } } },
    });
    return row ? toModel(row) : null;
  }

  async orderHistory(customerId: string) {
    const orders = await this.prisma.salesOrder.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0),
      createdAt: o.createdAt,
    }));
  }

  create(input: CreateCustomerInput, organizationId: string) {
    return this.prisma.customer
      .create({ data: { ...input, organizationId }, include: { _count: { select: { salesOrders: true } } } })
      .then(toModel);
  }

  async update(id: string, input: UpdateCustomerInput) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Customer not found");
    const row = await this.prisma.customer.update({
      where: { id },
      data: input,
      include: { _count: { select: { salesOrders: true } } },
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Customer not found");
    try {
      await this.prisma.customer.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException("Cannot delete customer — it still has linked orders or invoices.");
      }
      throw err;
    }
    return existing;
  }
}
