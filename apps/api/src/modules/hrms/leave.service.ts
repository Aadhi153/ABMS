import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EmployeeStatus, LeaveStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type {
  AdjustLeaveBalanceInput,
  BulkAllocateLeaveBalanceInput,
  CreateHolidayInput,
  CreateLeaveRequestInput,
  CreateLeaveTypeInput,
  HolidayFilterInput,
  LeaveRequestFilterInput,
  RecordLeaveEntryInput,
  SetWeeklyOffsInput,
} from "./dto/leave.input";

const LEAVE_REQUEST_INCLUDE = {
  employee: true,
  leaveType: true,
  approvedBy: true,
} as const;

function toRequestModel<
  T extends {
    employee: { firstName: string; lastName: string; employeeCode: string; department: string };
    leaveType: { name: string; code: string };
    approvedBy: { name: string } | null;
    totalDays: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    employeeCode: row.employee.employeeCode,
    department: row.employee.department,
    leaveTypeName: row.leaveType.name,
    leaveTypeCode: row.leaveType.code,
    approvedByName: row.approvedBy?.name ?? null,
    totalDays: Number(row.totalDays),
  };
}

function toBalanceModel<
  T extends {
    employee: { firstName: string; lastName: string; department: string };
    leaveType: { name: string };
    allocatedDays: unknown;
    usedDays: unknown;
    carriedOverDays: unknown;
  },
>(row: T) {
  const allocated = Number(row.allocatedDays);
  const used = Number(row.usedDays);
  const carried = Number(row.carriedOverDays);
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    department: row.employee.department,
    leaveTypeName: row.leaveType.name,
    allocatedDays: allocated,
    usedDays: used,
    carriedOverDays: carried,
    remainingDays: Math.round((allocated + carried - used) * 100) / 100,
  };
}

function countDays(start: Date, end: Date, halfDay: boolean) {
  if (halfDay) return 0.5;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
}

function toLeaveTypeModel<T extends { defaultDaysPerYear: unknown; maxCarryForwardDays: unknown }>(row: T) {
  return { ...row, defaultDaysPerYear: Number(row.defaultDaysPerYear), maxCarryForwardDays: Number(row.maxCarryForwardDays) };
}

function toHolidayModel<T extends { date: Date }>(row: T) {
  return row;
}

@Injectable()
export class LeaveService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  // --- Leave types ---

  async findLeaveTypes() {
    const rows = await this.prisma.leaveType.findMany({ orderBy: { name: "asc" } });
    return rows.map(toLeaveTypeModel);
  }

  async createLeaveType(input: CreateLeaveTypeInput, organizationId: string) {
    const row = await this.prisma.leaveType.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description,
        color: input.color,
        defaultDaysPerYear: input.defaultDaysPerYear,
        maxCarryForwardDays: input.maxCarryForwardDays,
        accrualType: input.accrualType,
        paid: input.paid,
        isLOP: input.isLOP,
        requiresApproval: input.requiresApproval,
        encashable: input.encashable,
        applicableGender: input.applicableGender,
        restrictedDesignations: input.restrictedDesignations,
        restrictedEmployeeIds: input.restrictedEmployeeIds,
        minServiceDays: input.minServiceDays,
        minNoticeDays: input.minNoticeDays,
        maxConsecutiveDays: input.maxConsecutiveDays,
        active: input.active,
        organizationId,
      },
    });
    return toLeaveTypeModel(row);
  }

  async updateLeaveType(id: string, input: CreateLeaveTypeInput) {
    const existing = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave type not found");
    const row = await this.prisma.leaveType.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        description: input.description,
        color: input.color,
        defaultDaysPerYear: input.defaultDaysPerYear,
        maxCarryForwardDays: input.maxCarryForwardDays,
        accrualType: input.accrualType,
        paid: input.paid,
        isLOP: input.isLOP,
        requiresApproval: input.requiresApproval,
        encashable: input.encashable,
        applicableGender: input.applicableGender,
        restrictedDesignations: input.restrictedDesignations,
        restrictedEmployeeIds: input.restrictedEmployeeIds,
        minServiceDays: input.minServiceDays,
        minNoticeDays: input.minNoticeDays,
        maxConsecutiveDays: input.maxConsecutiveDays,
        active: input.active,
      },
    });
    return toLeaveTypeModel(row);
  }

  async deleteLeaveType(id: string) {
    const existing = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave type not found");
    const [balanceCount, requestCount] = await Promise.all([
      this.prisma.leaveBalance.count({ where: { leaveTypeId: id } }),
      this.prisma.leaveRequest.count({ where: { leaveTypeId: id } }),
    ]);
    if (balanceCount > 0 || requestCount > 0) {
      throw new BadRequestException("This leave type has balances or requests recorded against it and cannot be deleted");
    }
    await this.prisma.leaveType.delete({ where: { id } });
    return existing;
  }

  // --- Leave balances ---

  async findLeaveBalances(employeeId?: string, year?: number, department?: string) {
    const rows = await this.prisma.leaveBalance.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(year ? { year } : {}),
        ...(department ? { employee: { department } } : {}),
      },
      include: { employee: true, leaveType: true },
      orderBy: [{ year: "desc" }],
    });
    return rows.map(toBalanceModel);
  }

  private async ensureBalance(organizationId: string, employeeId: string, leaveTypeId: string, year: number) {
    const existing = await this.prisma.leaveBalance.findUnique({
      where: { organizationId_employeeId_leaveTypeId_year: { organizationId, employeeId, leaveTypeId, year } },
    });
    if (existing) return existing;
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    return this.prisma.leaveBalance.create({
      data: {
        organizationId,
        employeeId,
        leaveTypeId,
        year,
        allocatedDays: leaveType?.defaultDaysPerYear ?? 0,
      },
    });
  }

  async adjustLeaveBalance(input: AdjustLeaveBalanceInput, organizationId: string) {
    const row = await this.prisma.leaveBalance.upsert({
      where: {
        organizationId_employeeId_leaveTypeId_year: {
          organizationId,
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          year: input.year,
        },
      },
      update: { allocatedDays: input.allocatedDays, carriedOverDays: input.carriedOverDays },
      create: {
        organizationId,
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        year: input.year,
        allocatedDays: input.allocatedDays,
        carriedOverDays: input.carriedOverDays,
      },
      include: { employee: true, leaveType: true },
    });
    return toBalanceModel(row);
  }

  async bulkAllocateLeaveBalance(input: BulkAllocateLeaveBalanceInput, organizationId: string) {
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: input.leaveTypeId } });
    if (!leaveType) throw new NotFoundException("Leave type not found");
    const days = input.overrideDays ?? Number(leaveType.defaultDaysPerYear);
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        status: EmployeeStatus.ACTIVE,
        ...(input.department ? { department: input.department } : {}),
      },
      select: { id: true },
    });
    await this.prisma.$transaction(
      employees.map((e) =>
        this.prisma.leaveBalance.upsert({
          where: {
            organizationId_employeeId_leaveTypeId_year: {
              organizationId,
              employeeId: e.id,
              leaveTypeId: input.leaveTypeId,
              year: input.year,
            },
          },
          update: { allocatedDays: days },
          create: {
            organizationId,
            employeeId: e.id,
            leaveTypeId: input.leaveTypeId,
            year: input.year,
            allocatedDays: days,
          },
        }),
      ),
    );
    return employees.length;
  }

  // --- Leave requests ---

  async findLeaveRequests(filter?: LeaveRequestFilterInput) {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.leaveTypeId ? { leaveTypeId: filter.leaveTypeId } : {}),
        ...(filter?.status ? { status: filter.status as never } : {}),
      },
      include: LEAVE_REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRequestModel);
  }

  async findLeaveRequestById(id: string) {
    const row = await this.prisma.leaveRequest.findUnique({ where: { id }, include: LEAVE_REQUEST_INCLUDE });
    return row ? toRequestModel(row) : null;
  }

  async createLeaveRequest(input: CreateLeaveRequestInput, organizationId: string) {
    const totalDays = countDays(input.startDate, input.endDate, !!input.halfDay);
    const year = input.startDate.getFullYear();
    await this.ensureBalance(organizationId, input.employeeId, input.leaveTypeId, year);
    const row = await this.prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        halfDay: !!input.halfDay,
        totalDays,
        reason: input.reason,
        status: LeaveStatus.PENDING,
      },
      include: LEAVE_REQUEST_INCLUDE,
    });
    return toRequestModel(row);
  }

  async recordLeaveEntry(input: RecordLeaveEntryInput, organizationId: string, actorId: string) {
    const totalDays = countDays(input.startDate, input.endDate, !!input.halfDay);
    const year = input.startDate.getFullYear();
    await this.ensureBalance(organizationId, input.employeeId, input.leaveTypeId, year);
    const row = await this.prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        halfDay: !!input.halfDay,
        totalDays,
        reason: input.reason,
        status: LeaveStatus.APPROVED,
        approvedById: actorId,
        approvedAt: new Date(),
      },
      include: LEAVE_REQUEST_INCLUDE,
    });
    await this.prisma.leaveBalance.update({
      where: {
        organizationId_employeeId_leaveTypeId_year: {
          organizationId,
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          year,
        },
      },
      data: { usedDays: { increment: totalDays } },
    });
    return toRequestModel(row);
  }

  async updateLeaveRequest(id: string, input: CreateLeaveRequestInput) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave request not found");
    if (existing.status !== LeaveStatus.PENDING) throw new BadRequestException("Only pending leave requests can be edited");
    const totalDays = countDays(input.startDate, input.endDate, !!input.halfDay);
    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        halfDay: !!input.halfDay,
        totalDays,
        reason: input.reason,
      },
      include: LEAVE_REQUEST_INCLUDE,
    });
    return toRequestModel(row);
  }

  async approveLeaveRequest(id: string, approverId: string) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave request not found");
    if (existing.status !== LeaveStatus.PENDING) throw new BadRequestException("Only pending leave requests can be approved");
    const year = existing.startDate.getFullYear();
    await this.ensureBalance(existing.organizationId, existing.employeeId, existing.leaveTypeId, year);
    await this.prisma.leaveBalance.update({
      where: {
        organizationId_employeeId_leaveTypeId_year: {
          organizationId: existing.organizationId,
          employeeId: existing.employeeId,
          leaveTypeId: existing.leaveTypeId,
          year,
        },
      },
      data: { usedDays: { increment: existing.totalDays } },
    });
    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.APPROVED, approvedById: approverId, approvedAt: new Date() },
      include: LEAVE_REQUEST_INCLUDE,
    });
    return toRequestModel(row);
  }

  async rejectLeaveRequest(id: string, reason: string, approverId: string) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave request not found");
    if (existing.status !== LeaveStatus.PENDING) throw new BadRequestException("Only pending leave requests can be rejected");
    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.REJECTED, approvedById: approverId, approvedAt: new Date(), rejectionReason: reason },
      include: LEAVE_REQUEST_INCLUDE,
    });
    return toRequestModel(row);
  }

  async cancelLeaveRequest(id: string) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave request not found");
    if (existing.status === LeaveStatus.APPROVED) {
      const year = existing.startDate.getFullYear();
      await this.prisma.leaveBalance.update({
        where: {
          organizationId_employeeId_leaveTypeId_year: {
            organizationId: existing.organizationId,
            employeeId: existing.employeeId,
            leaveTypeId: existing.leaveTypeId,
            year,
          },
        },
        data: { usedDays: { decrement: existing.totalDays } },
      });
    }
    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
      include: LEAVE_REQUEST_INCLUDE,
    });
    return toRequestModel(row);
  }

  async deleteLeaveRequest(id: string) {
    const existing = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave request not found");
    await this.prisma.leaveRequest.delete({ where: { id } });
    return existing;
  }

  // --- Holidays ---

  async findHolidays(filter?: HolidayFilterInput) {
    const rows = await this.prisma.holiday.findMany({
      where: {
        ...(filter?.year ? { date: { gte: new Date(Date.UTC(filter.year, 0, 1)), lt: new Date(Date.UTC(filter.year + 1, 0, 1)) } } : {}),
        ...(filter?.type ? { type: filter.type as never } : {}),
        ...(filter?.search
          ? { OR: [{ name: { contains: filter.search, mode: "insensitive" } }, { description: { contains: filter.search, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { date: "asc" },
    });
    return rows.map(toHolidayModel);
  }

  async createHoliday(input: CreateHolidayInput, organizationId: string) {
    const row = await this.prisma.holiday.create({
      data: {
        organizationId,
        name: input.name,
        date: input.date,
        type: input.type as never,
        description: input.description,
        paid: input.paid ?? true,
      },
    });
    return toHolidayModel(row);
  }

  async updateHoliday(id: string, input: CreateHolidayInput) {
    const existing = await this.prisma.holiday.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Holiday not found");
    const row = await this.prisma.holiday.update({
      where: { id },
      data: {
        name: input.name,
        date: input.date,
        type: input.type as never,
        description: input.description,
        paid: input.paid,
      },
    });
    return toHolidayModel(row);
  }

  async deleteHoliday(id: string) {
    const existing = await this.prisma.holiday.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Holiday not found");
    await this.prisma.holiday.delete({ where: { id } });
    return existing;
  }

  // --- Weekly offs ---

  async findWeeklyOffs() {
    return this.prisma.weeklyOff.findMany({ orderBy: { dayOfWeek: "asc" } });
  }

  async setWeeklyOffs(input: SetWeeklyOffsInput, organizationId: string) {
    const uniqueDays = Array.from(new Set(input.daysOfWeek)).filter((d) => d >= 0 && d <= 6);
    await this.prisma.$transaction([
      this.prisma.weeklyOff.deleteMany({ where: { organizationId } }),
      this.prisma.weeklyOff.createMany({ data: uniqueDays.map((dayOfWeek) => ({ organizationId, dayOfWeek })) }),
    ]);
    return this.findWeeklyOffs();
  }
}
