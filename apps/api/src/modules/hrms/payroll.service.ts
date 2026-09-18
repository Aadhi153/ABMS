import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  AttendanceStatus,
  CalculationType,
  EmployeeStatus,
  IncentiveStatus,
  LeaveStatus,
  LoanStatus,
  PayrollRunStatus,
  PayslipStatus,
  RepaymentStatus,
  SalaryComponentType,
} from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { CreatePayrollRunInput } from "./dto/payroll.input";

const RUN_INCLUDE = {
  processedBy: true,
  _count: { select: { payslips: true } },
} as const;

const PAYSLIP_INCLUDE = {
  employee: true,
  payrollRun: true,
  components: true,
} as const;

function toRunModel<T extends { processedBy: { name: string } | null; totalGross: unknown; totalDeductions: unknown; totalNet: unknown; _count: { payslips: number } }>(
  row: T,
) {
  const { _count, ...rest } = row;
  return {
    ...rest,
    processedByName: row.processedBy?.name ?? null,
    totalGross: Number(row.totalGross),
    totalDeductions: Number(row.totalDeductions),
    totalNet: Number(row.totalNet),
    payslipCount: _count.payslips,
  };
}

function toPayslipModel<
  T extends {
    employee: { firstName: string; lastName: string; employeeCode: string };
    payrollRun: { month: number; year: number };
    components: Array<{ amount: unknown }>;
    grossEarnings: unknown;
    totalDeductions: unknown;
    netPay: unknown;
    daysPresent: unknown;
    daysOnLeave: unknown;
  },
>(row: T) {
  return {
    ...row,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    employeeCode: row.employee.employeeCode,
    month: row.payrollRun.month,
    year: row.payrollRun.year,
    grossEarnings: Number(row.grossEarnings),
    totalDeductions: Number(row.totalDeductions),
    netPay: Number(row.netPay),
    daysPresent: Number(row.daysPresent),
    daysOnLeave: Number(row.daysOnLeave),
    components: row.components.map((c) => ({ ...c, amount: Number(c.amount) })),
  };
}

@Injectable()
export class PayrollService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async findAllRuns() {
    const rows = await this.prisma.payrollRun.findMany({ include: RUN_INCLUDE, orderBy: [{ year: "desc" }, { month: "desc" }] });
    return rows.map(toRunModel);
  }

  async findRunById(id: string) {
    const row = await this.prisma.payrollRun.findUnique({ where: { id }, include: RUN_INCLUDE });
    return row ? toRunModel(row) : null;
  }

  async findPayslips(filter?: { payrollRunId?: string; employeeId?: string }) {
    const rows = await this.prisma.payslip.findMany({
      where: {
        ...(filter?.payrollRunId ? { payrollRunId: filter.payrollRunId } : {}),
        ...(filter?.employeeId ? { employeeId: filter.employeeId } : {}),
      },
      include: PAYSLIP_INCLUDE,
      orderBy: { generatedAt: "desc" },
    });
    return rows.map(toPayslipModel);
  }

  async findPayslipById(id: string) {
    const row = await this.prisma.payslip.findUnique({ where: { id }, include: PAYSLIP_INCLUDE });
    return row ? toPayslipModel(row) : null;
  }

  async createRun(input: CreatePayrollRunInput, organizationId: string) {
    const existing = await this.prisma.payrollRun.findUnique({
      where: { organizationId_month_year: { organizationId, month: input.month, year: input.year } },
    });
    if (existing) throw new BadRequestException(`A payroll run for ${input.month}/${input.year} already exists`);
    const row = await this.prisma.payrollRun.create({
      data: { organizationId, month: input.month, year: input.year, status: PayrollRunStatus.DRAFT },
      include: RUN_INCLUDE,
    });
    return toRunModel(row);
  }

  private async nextPayslipNumber() {
    const count = await this.prisma.payslip.count();
    return `PS-${String(count + 1).padStart(5, "0")}`;
  }

  async processRun(id: string, organizationId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status === PayrollRunStatus.APPROVED || run.status === PayrollRunStatus.PAID || run.status === PayrollRunStatus.CANCELLED) {
      throw new BadRequestException(`Cannot process a payroll run that is already ${run.status}`);
    }

    if (run.status === PayrollRunStatus.PROCESSED) {
      await this.prisma.payslip.deleteMany({ where: { payrollRunId: id } });
    }

    const monthStart = new Date(run.year, run.month - 1, 1);
    const monthEnd = new Date(run.year, run.month, 1);
    const daysInMonth = new Date(run.year, run.month, 0).getDate();

    const employees = await this.prisma.employee.findMany({ where: { status: EmployeeStatus.ACTIVE } });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const employee of employees) {
      const basic = Number(employee.monthlyGrossSalary);
      const components: Array<{ name: string; type: SalaryComponentType; amount: number }> = [
        { name: "Basic", type: SalaryComponentType.EARNING, amount: basic },
      ];

      const assignments = await this.prisma.employeeSalaryComponent.findMany({
        where: {
          employeeId: employee.id,
          active: true,
          effectiveFrom: { lt: monthEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthStart } }],
        },
        include: { salaryComponent: true },
      });
      for (const a of assignments) {
        const sc = a.salaryComponent;
        const amount =
          a.amount !== null
            ? Number(a.amount)
            : sc.calculationType === CalculationType.PERCENTAGE
              ? Math.round(basic * (Number(sc.value) / 100) * 100) / 100
              : Number(sc.value);
        components.push({ name: sc.name, type: sc.type, amount });
      }

      const earningsBeforeExtras = components.filter((c) => c.type === SalaryComponentType.EARNING).reduce((s, c) => s + c.amount, 0);

      const unpaidLeaveRequests = await this.prisma.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          status: LeaveStatus.APPROVED,
          leaveType: { paid: false },
          startDate: { lt: monthEnd },
          endDate: { gte: monthStart },
        },
      });
      const unpaidDays = unpaidLeaveRequests.reduce((sum, r) => sum + Number(r.totalDays), 0);
      if (unpaidDays > 0) {
        const perDayRate = earningsBeforeExtras / daysInMonth;
        components.push({
          name: "Unpaid Leave Deduction",
          type: SalaryComponentType.DEDUCTION,
          amount: Math.round(perDayRate * unpaidDays * 100) / 100,
        });
      }

      const dueRepayments = await this.prisma.loanRepayment.findMany({
        where: {
          status: RepaymentStatus.SCHEDULED,
          dueDate: { gte: monthStart, lt: monthEnd },
          loan: { employeeId: employee.id, status: LoanStatus.ACTIVE },
        },
        include: { loan: true },
      });
      for (const r of dueRepayments) {
        components.push({ name: `Loan Repayment (${r.loan.loanNumber})`, type: SalaryComponentType.DEDUCTION, amount: Number(r.amount) });
      }

      const approvedIncentives = await this.prisma.incentive.findMany({
        where: { employeeId: employee.id, status: IncentiveStatus.APPROVED, awardDate: { gte: monthStart, lt: monthEnd } },
      });
      for (const inc of approvedIncentives) {
        components.push({ name: inc.title, type: SalaryComponentType.EARNING, amount: Number(inc.amount) });
      }

      const grossEarnings = Math.round(components.filter((c) => c.type === SalaryComponentType.EARNING).reduce((s, c) => s + c.amount, 0) * 100) / 100;
      const deductions = Math.round(components.filter((c) => c.type === SalaryComponentType.DEDUCTION).reduce((s, c) => s + c.amount, 0) * 100) / 100;
      const netPay = Math.round((grossEarnings - deductions) * 100) / 100;

      const attendanceLogs = await this.prisma.attendanceLog.findMany({
        where: { employeeId: employee.id, date: { gte: monthStart, lt: monthEnd } },
      });
      const daysPresent = attendanceLogs.filter((l) => l.status === AttendanceStatus.PRESENT || l.status === AttendanceStatus.LATE).length;
      const halfDays = attendanceLogs.filter((l) => l.status === AttendanceStatus.HALF_DAY).length * 0.5;
      const daysOnLeave = attendanceLogs.filter((l) => l.status === AttendanceStatus.ON_LEAVE).length;

      const payslipNumber = await this.nextPayslipNumber();
      const payslip = await this.prisma.payslip.create({
        data: {
          organizationId,
          payslipNumber,
          payrollRunId: id,
          employeeId: employee.id,
          grossEarnings,
          totalDeductions: deductions,
          netPay,
          daysPresent: daysPresent + halfDays,
          daysOnLeave,
          status: PayslipStatus.GENERATED,
          components: { create: components.map((c) => ({ name: c.name, type: c.type, amount: c.amount })) },
        },
      });

      if (dueRepayments.length > 0) {
        await this.prisma.loanRepayment.updateMany({
          where: { id: { in: dueRepayments.map((r) => r.id) } },
          data: { payslipId: payslip.id },
        });
      }
      if (approvedIncentives.length > 0) {
        await this.prisma.incentive.updateMany({
          where: { id: { in: approvedIncentives.map((i) => i.id) } },
          data: { payslipId: payslip.id },
        });
      }

      totalGross += grossEarnings;
      totalDeductions += deductions;
      totalNet += netPay;
    }

    const row = await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: PayrollRunStatus.PROCESSED,
        totalGross: Math.round(totalGross * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
      },
      include: RUN_INCLUDE,
    });
    return toRunModel(row);
  }

  async approveRun(id: string, actorId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status !== PayrollRunStatus.PROCESSED) throw new BadRequestException("Only processed runs can be approved");
    const row = await this.prisma.payrollRun.update({
      where: { id },
      data: { status: PayrollRunStatus.APPROVED, processedById: actorId, processedAt: new Date() },
      include: RUN_INCLUDE,
    });
    return toRunModel(row);
  }

  async markPaid(id: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status !== PayrollRunStatus.APPROVED) throw new BadRequestException("Only approved runs can be marked paid");

    const payslips = await this.prisma.payslip.findMany({ where: { payrollRunId: id } });
    const payslipIds = payslips.map((p) => p.id);

    await this.prisma.payslip.updateMany({ where: { id: { in: payslipIds } }, data: { status: PayslipStatus.PAID, paidAt: new Date() } });
    await this.prisma.loanRepayment.updateMany({
      where: { payslipId: { in: payslipIds } },
      data: { status: RepaymentStatus.PAID, paidAt: new Date() },
    });
    await this.prisma.incentive.updateMany({
      where: { payslipId: { in: payslipIds } },
      data: { status: IncentiveStatus.PAID },
    });

    const row = await this.prisma.payrollRun.update({ where: { id }, data: { status: PayrollRunStatus.PAID }, include: RUN_INCLUDE });
    return toRunModel(row);
  }

  async cancelRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status === PayrollRunStatus.PAID) throw new BadRequestException("A paid payroll run cannot be cancelled");
    await this.prisma.payslip.deleteMany({ where: { payrollRunId: id } });
    const row = await this.prisma.payrollRun.update({
      where: { id },
      data: { status: PayrollRunStatus.CANCELLED, totalGross: 0, totalDeductions: 0, totalNet: 0 },
      include: RUN_INCLUDE,
    });
    return toRunModel(row);
  }

  async deleteRun(id: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException("Payroll run not found");
    if (run.status !== PayrollRunStatus.DRAFT) throw new BadRequestException("Only draft payroll runs can be deleted");
    await this.prisma.payrollRun.delete({ where: { id } });
    return run;
  }
}
