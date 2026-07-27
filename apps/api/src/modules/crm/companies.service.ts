import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateCompanyInput, UpdateCompanyInput } from "./dto/company.input";

function toModel<T extends { _count: { contacts: number; deals: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, contactCount: _count.contacts, dealCount: _count.deals };
}

@Injectable()
export class CompaniesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.company.findMany({
      include: { _count: { select: { contacts: true, deals: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { contacts: true, deals: true } } },
    });
    return row ? toModel(row) : null;
  }

  contactsFor(companyId: string) {
    return this.prisma.contact.findMany({
      where: { companyId },
      include: { owner: true, company: true },
      orderBy: { createdAt: "asc" },
    });
  }

  create(input: CreateCompanyInput, organizationId: string) {
    return this.prisma.company
      .create({ data: { ...input, organizationId }, include: { _count: { select: { contacts: true, deals: true } } } })
      .then(toModel);
  }

  async update(id: string, input: UpdateCompanyInput) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Company not found");
    const row = await this.prisma.company.update({
      where: { id },
      data: input,
      include: { _count: { select: { contacts: true, deals: true } } },
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Company not found");
    try {
      await this.prisma.company.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException("Cannot delete company — it still has linked contacts or deals.");
      }
      throw err;
    }
    return existing;
  }
}
