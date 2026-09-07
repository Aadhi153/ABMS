import { Inject, Injectable } from "@nestjs/common";
import { AttendanceStatus, EmployeeStatus, IncentiveStatus, LeaveStatus, LoanStatus, PayrollRunStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { EmployeesService } from "./employees.service";
import { PayrollService } from "./payroll.service";

function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

@Injectable()
export class OverviewService {
  constructor(
    @Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient,
    private readonly employeesService: EmployeesService,
    private readonly payrollService: PayrollService,
  ) {}

  async getOverview() {
    const today = toDateOnly(new Date());

    const [
      totalEmployees,
      activeEmployees,
      todaysLogs,
      pendingLeaveRequests,
      pendingLoanApprovals,
      pendingSalaryRevisions,
      pendingIncentiveApprovals,
      departmentGroups,
      allEmployees,
      allRuns,
    ] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
      this.prisma.attendanceLog.findMany({ where: { date: today } }),
      this.prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
      this.prisma.employeeLoan.count({ where: { status: LoanStatus.PENDING } }),
      this.prisma.salaryRevision.count({ where: { status: "PENDING" as never } }),
      this.prisma.incentive.count({ where: { status: IncentiveStatus.PENDING } }),
      this.prisma.employee.groupBy({ by: ["department"], where: { status: EmployeeStatus.ACTIVE }, _count: { _all: true } }),
      this.employeesService.findAll(),
      this.payrollService.findAllRuns(),
    ]);

    const presentToday = todaysLogs.filter((l) => l.status === AttendanceStatus.PRESENT || l.status === AttendanceStatus.LATE).length;
    const absentToday = todaysLogs.filter((l) => l.status === AttendanceStatus.ABSENT).length;
    const onLeaveToday = todaysLogs.filter((l) => l.status === AttendanceStatus.ON_LEAVE).length;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentJoiners = allEmployees
      .filter((e) => e.dateOfJoining >= thirtyDaysAgo)
      .sort((a, b) => b.dateOfJoining.getTime() - a.dateOfJoining.getTime())
      .slice(0, 5);

    const recentPayrollRuns = allRuns.slice(0, 3);
    const upcomingPayrollRun = allRuns.find((r) => r.status === PayrollRunStatus.DRAFT || r.status === PayrollRunStatus.PROCESSED) ?? null;

    return {
      totalEmployees,
      activeEmployees,
      onLeaveToday,
      presentToday,
      absentToday,
      pendingLeaveRequests,
      pendingLoanApprovals,
      pendingSalaryRevisions,
      pendingIncentiveApprovals,
      upcomingPayrollRun,
      headcountByDepartment: departmentGroups.map((g) => ({ department: g.department, count: g._count._all })),
      recentJoiners,
      recentPayrollRuns,
    };
  }
}
