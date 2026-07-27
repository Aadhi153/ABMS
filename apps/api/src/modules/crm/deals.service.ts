import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateDealInput, UpdateDealInput } from "./dto/deal.input";

const INCLUDE = { owner: true, contact: true, company: true } as const;

function toModel<T extends { value: unknown; contact: { name: string } | null; company: { name: string } | null }>(row: T) {
  const { contact, company, ...rest } = row;
  return { ...rest, value: Number(row.value), contactName: contact?.name ?? null, companyName: company?.name ?? null };
}

@Injectable()
export class DealsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.deal.findMany({ include: INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.deal.findUnique({ where: { id }, include: INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateDealInput, actorId: string, organizationId: string) {
    const row = await this.prisma.deal.create({
      data: { ...input, ownerId: input.ownerId ?? actorId, organizationId },
      include: INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: UpdateDealInput) {
    const existing = await this.prisma.deal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Deal not found");
    const row = await this.prisma.deal.update({ where: { id }, data: input, include: INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.deal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Deal not found");
    try {
      await this.prisma.deal.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException("Cannot delete deal — it still has linked tasks or sales orders.");
      }
      throw err;
    }
    return existing;
  }
}
