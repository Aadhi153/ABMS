import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateCustomerInput, UpdateCustomerInput } from "./dto/customer.input";

function toModel<T extends { creditLimit: unknown; _count: { salesOrders: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, creditLimit: rest.creditLimit == null ? null : Number(rest.creditLimit), orderCount: _count.salesOrders };
}

const CUSTOMER_INCLUDE = { contacts: true, _count: { select: { salesOrders: true } } } as const;

@Injectable()
export class CustomersService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.customer.findMany({
      include: CUSTOMER_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      include: CUSTOMER_INCLUDE,
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

  private async nextCustomerCode(organizationId: string) {
    const count = await this.prisma.customer.count({ where: { organizationId } });
    return `CUST-${String(count + 1).padStart(5, "0")}`;
  }

  async create(input: CreateCustomerInput, organizationId: string) {
    const { contacts, ...rest } = input;
    const code = await this.nextCustomerCode(organizationId);
    const row = await this.prisma.customer.create({
      data: {
        ...rest,
        code,
        organizationId,
        contacts: contacts?.length ? { create: contacts.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary ?? false })) } : undefined,
      },
      include: CUSTOMER_INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: UpdateCustomerInput) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Customer not found");
    const { contacts, ...rest } = input;
    const row = await this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        // A full replace of the contacts list on every update — the client always sends the
        // complete desired set (rows are managed entirely in the form's local state), so a
        // blanket delete+recreate is simpler and safer than diffing by id.
        contacts: contacts ? { deleteMany: {}, create: contacts.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary ?? false })) } : undefined,
      },
      include: CUSTOMER_INCLUDE,
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
