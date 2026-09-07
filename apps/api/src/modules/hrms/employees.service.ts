import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreateEmployeeInput, EmployeeFilterInput } from "./dto/employee.input";

const EMPLOYEE_INCLUDE = {
  reportingManager: true,
  shift: true,
  grade: true,
} as const;

function toModel<
  T extends {
    firstName: string;
    lastName: string;
    monthlyGrossSalary: unknown;
    reportingManager: { firstName: string; lastName: string } | null;
    shift: { name: string } | null;
    grade: { name: string } | null;
  },
>(row: T) {
  return {
    ...row,
    fullName: `${row.firstName} ${row.lastName}`,
    reportingManagerName: row.reportingManager ? `${row.reportingManager.firstName} ${row.reportingManager.lastName}` : null,
    shiftName: row.shift?.name ?? null,
    gradeName: row.grade?.name ?? null,
    monthlyGrossSalary: Number(row.monthlyGrossSalary),
  };
}

@Injectable()
export class EmployeesService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAll(filter?: EmployeeFilterInput) {
    const search = filter?.search?.trim();
    const rows = await this.prisma.employee.findMany({
      where: {
        ...(filter?.status ? { status: filter.status as never } : {}),
        ...(filter?.department ? { department: filter.department } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { employeeCode: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: EMPLOYEE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toModel);
  }

  async findById(id: string) {
    const row = await this.prisma.employee.findUnique({ where: { id }, include: EMPLOYEE_INCLUDE });
    return row ? toModel(row) : null;
  }

  private async nextEmployeeCode() {
    const count = await this.prisma.employee.count();
    return `EMP-${String(count + 1).padStart(4, "0")}`;
  }

  async create(input: CreateEmployeeInput, organizationId: string) {
    const employeeCode = await this.nextEmployeeCode();
    const row = await this.prisma.employee.create({
      data: {
        employeeCode,
        userId: input.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        dateOfJoining: input.dateOfJoining,
        designation: input.designation,
        department: input.department,
        employmentType: input.employmentType,
        status: input.status,
        reportingManagerId: input.reportingManagerId,
        shiftId: input.shiftId,
        gradeId: input.gradeId,
        monthlyGrossSalary: input.monthlyGrossSalary,
        bankAccountNumber: input.bankAccountNumber,
        bankName: input.bankName,
        bankIfsc: input.bankIfsc,
        panNumber: input.panNumber,
        address: input.address,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        avatarUrl: input.avatarUrl,
        notes: input.notes,
        organizationId,
      },
      include: EMPLOYEE_INCLUDE,
    });
    return toModel(row);
  }

  async update(id: string, input: CreateEmployeeInput) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Employee not found");
    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        userId: input.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        dateOfJoining: input.dateOfJoining,
        designation: input.designation,
        department: input.department,
        employmentType: input.employmentType,
        reportingManagerId: input.reportingManagerId,
        shiftId: input.shiftId,
        gradeId: input.gradeId,
        monthlyGrossSalary: input.monthlyGrossSalary,
        bankAccountNumber: input.bankAccountNumber,
        bankName: input.bankName,
        bankIfsc: input.bankIfsc,
        panNumber: input.panNumber,
        address: input.address,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        avatarUrl: input.avatarUrl,
        notes: input.notes,
      },
      include: EMPLOYEE_INCLUDE,
    });
    return toModel(row);
  }

  async updateStatus(id: string, status: string) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Employee not found");
    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        status: status as never,
        dateOfExit: status === "TERMINATED" || status === "RESIGNED" ? new Date() : existing.dateOfExit,
      },
      include: EMPLOYEE_INCLUDE,
    });
    return toModel(row);
  }

  async delete(id: string) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Employee not found");
    const [attendanceCount, payslipCount, leaveCount, loanCount] = await Promise.all([
      this.prisma.attendanceLog.count({ where: { employeeId: id } }),
      this.prisma.payslip.count({ where: { employeeId: id } }),
      this.prisma.leaveRequest.count({ where: { employeeId: id } }),
      this.prisma.employeeLoan.count({ where: { employeeId: id } }),
    ]);
    if (attendanceCount > 0 || payslipCount > 0 || leaveCount > 0 || loanCount > 0) {
      throw new BadRequestException(
        "This employee has attendance, leave, loan, or payroll history and cannot be deleted — mark them Terminated/Resigned instead",
      );
    }
    await this.prisma.employee.delete({ where: { id } });
    return existing;
  }
}
