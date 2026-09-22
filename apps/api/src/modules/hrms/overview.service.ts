import { Inject, Injectable } from "@nestjs/common";
import { AttendanceStatus, EmployeeStatus, IncentiveStatus, LeaveStatus, LoanStatus, PayrollRunStatus } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { EmployeesService } from "./employees.service";
import { PayrollService } from "./payroll.service";
import { LoansService } from "./loans.service";
import { LeaveService } from "./leave.service";

function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

@Injectable()
export class OverviewService {
  constructor(
    @Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient,
    private readonly employeesService: EmployeesService,
    private readonly payrollService: PayrollService,
    private readonly loansService: LoansService,
    private readonly leaveService: LeaveService,
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
      activeDivisions,
      allLoans,
      allLeaveBalances,
      leaveTypes,
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
      this.prisma.department.count(),
      this.loansService.findAll(),
      this.leaveService.findLeaveBalances(undefined, new Date().getFullYear()),
      this.prisma.leaveType.findMany(),
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

    const attendancePct = activeEmployees > 0 ? Math.round((presentToday / activeEmployees) * 100) : 0;

    const monthlyPayrollEstimate = allEmployees
      .filter((e) => e.status === EmployeeStatus.ACTIVE)
      .reduce((sum, e) => sum + Number(e.monthlyGrossSalary ?? 0), 0);

    const activeLoans = allLoans.filter((l) => l.status === LoanStatus.ACTIVE);
    const loanPortfolio = {
      totalOutstanding: Math.round(activeLoans.reduce((sum, l) => sum + l.outstandingAmount, 0) * 100) / 100,
      activeAgreements: activeLoans.length,
      pendingApprovals: pendingLoanApprovals,
    };

    const leaveTypeColorById = new Map(leaveTypes.map((t) => [t.id, t.color]));
    const leaveSnapshotByType = new Map<string, { leaveTypeName: string; color: string; usedDays: number; allocatedDays: number }>();
    for (const b of allLeaveBalances) {
      const existing = leaveSnapshotByType.get(b.leaveTypeName);
      if (existing) {
        existing.usedDays += b.usedDays;
        existing.allocatedDays += b.allocatedDays;
      } else {
        leaveSnapshotByType.set(b.leaveTypeName, {
          leaveTypeName: b.leaveTypeName,
          color: leaveTypeColorById.get(b.leaveTypeId) ?? "#94a3b8",
          usedDays: b.usedDays,
          allocatedDays: b.allocatedDays,
        });
      }
    }
    const leaveBalanceSnapshot = Array.from(leaveSnapshotByType.values());

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
      activeDivisions,
      attendancePct,
      monthlyPayrollEstimate,
      loanPortfolio,
      leaveBalanceSnapshot,
    };
  }
}
