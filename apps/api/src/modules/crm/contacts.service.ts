import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateContactInput, UpdateContactInput } from "./dto/contact.input";

const INCLUDE = { owner: true, company: true } as const;

function toModel<T extends { owner: unknown; company: { name: string } | null }>(row: T) {
  const { company, ...rest } = row;
  return { ...rest, companyName: company?.name ?? null };
}

@Injectable()
export class ContactsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.contact.findMany({ include: INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.contact.findUnique({ where: { id }, include: INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateContactInput, actorId: string, organizationId: string) {
    const row = await this.prisma.contact.create({
      data: { ...input, tags: input.tags ?? [], ownerId: input.ownerId ?? actorId, organizationId },
      include: INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: UpdateContactInput) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Contact not found");
    const row = await this.prisma.contact.update({ where: { id }, data: input, include: INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Contact not found");
    try {
      await this.prisma.contact.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException("Cannot delete contact — it still has linked deals, tasks, or a customer record.");
      }
      throw err;
    }
    return existing;
  }
}
