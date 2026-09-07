import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { AttendanceFilterInput, BulkMarkAttendanceInput, MarkAttendanceInput } from "./dto/attendance.input";

const ATTENDANCE_INCLUDE = {
  employee: true,
  shift: true,
  markedBy: true,
} as const;

function toModel<
  T extends {
    employee: { firstName: string; lastName: string; employeeCode: string };
    shift: { name: string } | null;
    markedBy: { name: string } | null;
    workedHours: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    employeeCode: row.employee.employeeCode,
    shiftName: row.shift?.name ?? null,
    markedByName: row.markedBy?.name ?? null,
    workedHours: row.workedHours === null || row.workedHours === undefined ? null : Number(row.workedHours),
  };
}

function toDateOnly(date: Date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseHHMM(value: string) {
  const [h, m] = value.split(":").map(Number);
  return { h, m };
}

@Injectable()
export class AttendanceService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: AttendanceFilterInput) {
    const rows = await this.prisma.attendanceLog.findMany({
      where: {
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
        ...(filter?.status ? { status: filter.status as never } : {}),
        ...(filter?.from || filter?.to
          ? {
              date: {
                ...(filter?.from ? { gte: toDateOnly(filter.from) } : {}),
                ...(filter?.to ? { lte: toDateOnly(filter.to) } : {}),
              },
            }
          : {}),
      },
      include: ATTENDANCE_INCLUDE,
      orderBy: { date: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.attendanceLog.findUnique({ where: { id }, include: ATTENDANCE_INCLUDE });
    return row ? toModel(row) : null;
  }

  async summary(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const logs = await this.prisma.attendanceLog.findMany({
      where: { date: { gte: start, lt: end } },
      include: { employee: true },
    });
    const map = new Map<
      string,
      { employeeId: string; employeeName: string; presentDays: number; absentDays: number; lateDays: number; halfDays: number; onLeaveDays: number; totalWorkedHours: number }
    >();
    for (const log of logs) {
      if (!map.has(log.employeeId)) {
        map.set(log.employeeId, {
          employeeId: log.employeeId,
          employeeName: `${log.employee.firstName} ${log.employee.lastName}`,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          halfDays: 0,
          onLeaveDays: 0,
          totalWorkedHours: 0,
        });
      }
      const acc = map.get(log.employeeId)!;
      if (log.status === AttendanceStatus.PRESENT) acc.presentDays += 1;
      else if (log.status === AttendanceStatus.ABSENT) acc.absentDays += 1;
      else if (log.status === AttendanceStatus.LATE) acc.lateDays += 1;
      else if (log.status === AttendanceStatus.HALF_DAY) acc.halfDays += 0.5;
      else if (log.status === AttendanceStatus.ON_LEAVE) acc.onLeaveDays += 1;
      if (log.workedHours) acc.totalWorkedHours += Number(log.workedHours);
    }
    return Array.from(map.values());
  }

  private async resolveStatusForCheckIn(employeeId: string, checkIn: Date) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { shift: true } });
    if (!employee?.shift) return AttendanceStatus.PRESENT;
    const { h, m } = parseHHMM(employee.shift.startTime);
    const deadline = new Date(checkIn);
    deadline.setHours(h, m + employee.shift.gracePeriodMinutes, 0, 0);
    return checkIn > deadline ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  }

  async checkIn(employeeId: string, organizationId: string) {
    const now = new Date();
    const date = toDateOnly(now);
    const status = await this.resolveStatusForCheckIn(employeeId, now);
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException("Employee not found");
    const row = await this.prisma.attendanceLog.upsert({
      where: { organizationId_employeeId_date: { organizationId, employeeId, date } },
      update: { checkIn: now, status },
      create: { organizationId, employeeId, date, checkIn: now, status, shiftId: employee.shiftId },
      include: ATTENDANCE_INCLUDE,
    });
    return toModel(row);
  }

  async checkOut(employeeId: string, organizationId: string) {
    const date = toDateOnly(new Date());
    const existing = await this.prisma.attendanceLog.findUnique({
      where: { organizationId_employeeId_date: { organizationId, employeeId, date } },
    });
    if (!existing || !existing.checkIn) throw new BadRequestException("Employee has not checked in today");
    const checkOut = new Date();
    const rawHours = (checkOut.getTime() - existing.checkIn.getTime()) / 3_600_000;
    const workedHours = Math.max(0, Math.round(rawHours * 100) / 100);
    const row = await this.prisma.attendanceLog.update({
      where: { id: existing.id },
      data: { checkOut, workedHours },
      include: ATTENDANCE_INCLUDE,
    });
    return toModel(row);
  }

  async markAttendance(input: MarkAttendanceInput, organizationId: string, markedById: string) {
    const date = toDateOnly(input.date);
    const workedHours =
      input.checkIn && input.checkOut ? Math.max(0, Math.round(((input.checkOut.getTime() - input.checkIn.getTime()) / 3_600_000) * 100) / 100) : undefined;
    const row = await this.prisma.attendanceLog.upsert({
      where: { organizationId_employeeId_date: { organizationId, employeeId: input.employeeId, date } },
      update: { checkIn: input.checkIn, checkOut: input.checkOut, status: input.status, notes: input.notes, workedHours, markedById },
      create: {
        organizationId,
        employeeId: input.employeeId,
        date,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        status: input.status,
        notes: input.notes,
        workedHours,
        markedById,
      },
      include: ATTENDANCE_INCLUDE,
    });
    return toModel(row);
  }

  async bulkMarkAttendance(input: BulkMarkAttendanceInput, organizationId: string, markedById: string) {
    const date = toDateOnly(input.date);
    const rows = [];
    for (const entry of input.entries) {
      const row = await this.prisma.attendanceLog.upsert({
        where: { organizationId_employeeId_date: { organizationId, employeeId: entry.employeeId, date } },
        update: { status: entry.status, markedById },
        create: { organizationId, employeeId: entry.employeeId, date, status: entry.status, markedById },
        include: ATTENDANCE_INCLUDE,
      });
      rows.push(toModel(row));
    }
    return rows;
  }

  async delete(id: string) {
    const existing = await this.prisma.attendanceLog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Attendance log not found");
    await this.prisma.attendanceLog.delete({ where: { id } });
    return existing;
  }
}
