import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus, BiometricTerminalStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type {
  AddAttendanceSessionInput,
  AttendanceFilterInput,
  BulkMarkAttendanceInput,
  CreateBiometricTerminalInput,
  MarkAttendanceInput,
  SyncBiometricLogsInput,
  UpdateBiometricTerminalInput,
} from "./dto/attendance.input";

const ATTENDANCE_INCLUDE = {
  employee: { include: { branch: true } },
  shift: true,
  markedBy: true,
  checkInTerminal: true,
  checkOutTerminal: true,
  sessions: { include: { terminal: true }, orderBy: { sessionIndex: "asc" as const } },
} as const;

function toModel<
  T extends {
    employee: { firstName: string; lastName: string; employeeCode: string; department: string; designation: string; branchId: string | null; branch: { name: string } | null };
    shift: { name: string; code: string | null } | null;
    markedBy: { name: string } | null;
    checkInTerminal: { name: string } | null;
    checkOutTerminal: { name: string } | null;
    sessions: { id: string; attendanceLogId: string; sessionIndex: number; checkIn: Date | null; checkOut: Date | null; terminalId: string | null; terminal: { name: string } | null; verifyMethod: string | null }[];
    workedHours: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    employeeCode: row.employee.employeeCode,
    department: row.employee.department,
    designation: row.employee.designation,
    branchId: row.employee.branchId,
    branchName: row.employee.branch?.name ?? null,
    shiftName: row.shift?.name ?? null,
    shiftCode: row.shift?.code ?? null,
    markedByName: row.markedBy?.name ?? null,
    checkInTerminalName: row.checkInTerminal?.name ?? null,
    checkOutTerminalName: row.checkOutTerminal?.name ?? null,
    sessions: row.sessions.map((s) => ({ ...s, terminalName: s.terminal?.name ?? null })),
    workedHours: row.workedHours === null || row.workedHours === undefined ? null : Number(row.workedHours),
  };
}

function toTerminalModel<T extends { branch: { name: string } | null }>(row: T) {
  return { ...row, branchName: row.branch?.name ?? null };
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
        ...(filter?.shiftId ? { shiftId: filter.shiftId } : {}),
        ...(filter?.from || filter?.to
          ? {
              date: {
                ...(filter?.from ? { gte: toDateOnly(filter.from) } : {}),
                ...(filter?.to ? { lte: toDateOnly(filter.to) } : {}),
              },
            }
          : {}),
        ...(filter?.branchId || filter?.department
          ? {
              employee: {
                ...(filter?.branchId ? { branchId: filter.branchId } : {}),
                ...(filter?.department ? { department: filter.department } : {}),
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
      {
        employeeId: string;
        employeeName: string;
        presentDays: number;
        absentDays: number;
        lateDays: number;
        halfDays: number;
        paidLeaveDays: number;
        lopDays: number;
        totalWorkedHours: number;
      }
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
          paidLeaveDays: 0,
          lopDays: 0,
          totalWorkedHours: 0,
        });
      }
      const acc = map.get(log.employeeId)!;
      if (log.status === AttendanceStatus.PRESENT) acc.presentDays += 1;
      else if (log.status === AttendanceStatus.ABSENT) acc.absentDays += 1;
      else if (log.status === AttendanceStatus.LATE) acc.lateDays += 1;
      else if (log.status === AttendanceStatus.HALF_DAY) acc.halfDays += 0.5;
      else if (log.status === AttendanceStatus.PAID_LEAVE) acc.paidLeaveDays += 1;
      else if (log.status === AttendanceStatus.LOP) acc.lopDays += 1;
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
      update: { checkIn: input.checkIn, checkOut: input.checkOut, status: input.status, notes: input.notes, workedHours, markedById, shiftId: input.shiftId },
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
        shiftId: input.shiftId,
      },
      include: ATTENDANCE_INCLUDE,
    });
    return toModel(row);
  }

  async bulkMarkAttendance(input: BulkMarkAttendanceInput, organizationId: string, markedById: string) {
    const date = toDateOnly(input.date);
    const rows = [];
    for (const entry of input.entries) {
      const workedHours =
        entry.checkIn && entry.checkOut
          ? Math.max(0, Math.round(((entry.checkOut.getTime() - entry.checkIn.getTime()) / 3_600_000) * 100) / 100)
          : undefined;
      const row = await this.prisma.attendanceLog.upsert({
        where: { organizationId_employeeId_date: { organizationId, employeeId: entry.employeeId, date } },
        update: { status: entry.status, checkIn: entry.checkIn, checkOut: entry.checkOut, notes: entry.notes, workedHours, markedById },
        create: {
          organizationId,
          employeeId: entry.employeeId,
          date,
          status: entry.status,
          checkIn: entry.checkIn,
          checkOut: entry.checkOut,
          notes: entry.notes,
          workedHours,
          markedById,
        },
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

  // No eSSL SDK / device is reachable from this environment, so this validates
  // input and reports honestly rather than faking a hardware sync.
  async syncBiometricLogs(input: SyncBiometricLogsInput) {
    const branch = await this.prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) throw new NotFoundException("Branch not found");
    return {
      success: true,
      syncedCount: 0,
      message: "No biometric device connected in this environment.",
    };
  }

  async findTerminals() {
    const rows = await this.prisma.biometricTerminal.findMany({ include: { branch: true }, orderBy: { name: "asc" } });
    return rows.map(toTerminalModel);
  }

  async createTerminal(input: CreateBiometricTerminalInput, organizationId: string) {
    const row = await this.prisma.biometricTerminal.create({
      data: {
        organizationId,
        name: input.name,
        code: input.code,
        branchId: input.branchId,
        capabilities: input.capabilities,
        status: input.status ?? BiometricTerminalStatus.OFFLINE,
        active: input.active ?? true,
      },
      include: { branch: true },
    });
    return toTerminalModel(row);
  }

  async updateTerminal(id: string, input: UpdateBiometricTerminalInput) {
    const existing = await this.prisma.biometricTerminal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Biometric terminal not found");
    const row = await this.prisma.biometricTerminal.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        branchId: input.branchId,
        capabilities: input.capabilities,
        status: input.status,
        active: input.active,
      },
      include: { branch: true },
    });
    return toTerminalModel(row);
  }

  async deleteTerminal(id: string) {
    const existing = await this.prisma.biometricTerminal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Biometric terminal not found");
    await this.prisma.biometricTerminal.delete({ where: { id } });
    return existing;
  }

  async addAttendanceSession(input: AddAttendanceSessionInput) {
    const log = await this.prisma.attendanceLog.findUnique({ where: { id: input.attendanceLogId }, include: { sessions: true } });
    if (!log) throw new NotFoundException("Attendance log not found");
    const nextIndex = log.sessions.reduce((max, s) => Math.max(max, s.sessionIndex), 1) + 1;

    await this.prisma.attendanceSession.create({
      data: {
        attendanceLogId: log.id,
        sessionIndex: nextIndex,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        terminalId: input.terminalId,
        verifyMethod: input.verifyMethod,
      },
    });

    if (input.terminalId) {
      await this.prisma.biometricTerminal.update({
        where: { id: input.terminalId },
        data: { status: BiometricTerminalStatus.ONLINE, lastSeenAt: new Date() },
      });
    }

    const session1Hours =
      log.checkIn && log.checkOut ? Math.max(0, (log.checkOut.getTime() - log.checkIn.getTime()) / 3_600_000) : 0;
    const allSessions = await this.prisma.attendanceSession.findMany({ where: { attendanceLogId: log.id } });
    const extraHours = allSessions.reduce((sum, s) => (s.checkIn && s.checkOut ? sum + Math.max(0, (s.checkOut.getTime() - s.checkIn.getTime()) / 3_600_000) : sum), 0);
    const workedHours = Math.round((session1Hours + extraHours) * 100) / 100;

    const row = await this.prisma.attendanceLog.update({
      where: { id: log.id },
      data: { workedHours },
      include: ATTENDANCE_INCLUDE,
    });
    return toModel(row);
  }
}
