import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateTaskInput, UpdateTaskInput } from "./dto/task.input";

const INCLUDE = { assignee: true, contact: true, deal: true } as const;

function toModel<T extends { contact: { name: string } | null; deal: { title: string } | null }>(row: T) {
  const { contact, deal, ...rest } = row;
  return { ...rest, contactName: contact?.name ?? null, dealTitle: deal?.title ?? null };
}

@Injectable()
export class TasksService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.task.findMany({ include: INCLUDE, orderBy: { dueDate: "asc" } });
    return rows.map(toModel);
  }

  async create(input: CreateTaskInput, actorId: string, organizationId: string) {
    const row = await this.prisma.task.create({
      data: { ...input, assigneeId: input.assigneeId ?? actorId, organizationId },
      include: INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: UpdateTaskInput) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Task not found");
    const row = await this.prisma.task.update({ where: { id }, data: input, include: INCLUDE });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Task not found");
    await this.prisma.task.delete({ where: { id } });
    return existing;
  }
}
