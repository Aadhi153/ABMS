import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateShiftInput } from "./dto/shift.input";

const SHIFT_INCLUDE = {
  _count: { select: { employees: true } },
} as const;

function toModel<T extends { _count: { employees: number } }>(row: T) {
  const { _count, ...rest } = row;
  return { ...rest, employeeCount: _count.employees };
}

@Injectable()
export class ShiftsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll() {
    const rows = await this.prisma.shift.findMany({ include: SHIFT_INCLUDE, orderBy: { name: "asc" } });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.shift.findUnique({ where: { id }, include: SHIFT_INCLUDE });
    return row ? toModel(row) : null;
  }

  async create(input: CreateShiftInput, organizationId: string) {
    const row = await this.prisma.shift.create({
      data: {
        name: input.name,
        code: input.code,
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes,
        gracePeriodMinutes: input.gracePeriodMinutes,
        workingDays: input.workingDays,
        active: input.active,
        organizationId,
      },
      include: SHIFT_INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: CreateShiftInput) {
    const existing = await this.prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Shift not found");
    const row = await this.prisma.shift.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes,
        gracePeriodMinutes: input.gracePeriodMinutes,
        workingDays: input.workingDays,
        active: input.active,
      },
      include: SHIFT_INCLUDE,
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.shift.findUnique({ where: { id }, include: SHIFT_INCLUDE });
    if (!existing) throw new NotFoundException("Shift not found");
    if (existing._count.employees > 0) {
      throw new BadRequestException("Cannot delete a shift with employees assigned to it");
    }
    await this.prisma.shift.delete({ where: { id } });
    return toModel(existing);
  }
}
