import { gql, useQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  FileSpreadsheet,
  Gift,
  HandCoins,
  IdCard,
  ClipboardCheck,
  CalendarRange,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, StatusBadge, cn } from "@abms/ui";
import { CARD_HOVER } from "../products/form-motion";
import type { HrmsOverview } from "./types";

const OVERVIEW_QUERY = gql`
  query HrmsOverviewData {
    hrmsOverview {
      totalEmployees
      activeEmployees
      onLeaveToday
      presentToday
      absentToday
      pendingLeaveRequests
      pendingLoanApprovals
      pendingSalaryRevisions
      pendingIncentiveApprovals
      activeDivisions
      attendancePct
      monthlyPayrollEstimate
      loanPortfolio {
        totalOutstanding
        activeAgreements
        pendingApprovals
      }
      leaveBalanceSnapshot {
        leaveTypeName
        color
        usedDays
        allocatedDays
      }
      headcountByDepartment {
        department
        count
      }
      recentJoiners {
        id
        fullName
        employeeCode
        department
        designation
        monthlyGrossSalary
        status
      }
    }
  }
`;

const ROW_TONES = [
  "bg-teal-500",
  "bg-rose-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-slate-400",
];
const AVATAR_TONES = [
  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-orange-500/15 text-orange-600 dark:text-orange-400",
];

function inrWhole(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const QUICK_ACTIONS = [
  { label: "Time & Attendance", icon: Clock3, to: "/hrms/attendance", iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  { label: "Roster & Shifts", icon: CalendarRange, to: "/hrms/shifts", iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { label: "Salaries & Payroll", icon: Wallet, to: "/hrms/payroll", iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  { label: "Generate Payslip", icon: FileSpreadsheet, to: "/hrms/payroll", iconBg: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  { label: "Staff Registry", icon: IdCard, to: "/hrms/employees", iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  { label: "Allowance Master", icon: Gift, to: "/hrms/allowances", iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { label: "Company Holidays", icon: CalendarDays, to: "/hrms/leave", iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { label: "Performance & Incentives", icon: ClipboardCheck, to: "/hrms/performance", iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
];

export default function OverviewTab() {
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ hrmsOverview: HrmsOverview }>(OVERVIEW_QUERY);
  const o = data?.hrmsOverview;

  if (loading && !o) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  if (!o) return null;

  const pendingApprovals = o.pendingLeaveRequests + o.pendingLoanApprovals + o.pendingSalaryRevisions + o.pendingIncentiveApprovals;
  const maxDept = Math.max(1, ...o.headcountByDepartment.map((d) => d.count));
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const heroStats = [
    { label: "Active Staff", value: o.activeEmployees, valueClass: "text-primary" },
    { label: "Attendance", value: `${o.attendancePct}%`, valueClass: "text-success" },
    { label: "Loans Out", value: inrWhole(o.loanPortfolio.totalOutstanding), valueClass: "text-warning" },
    { label: "Pending Loans", value: o.loanPortfolio.pendingApprovals, valueClass: "text-danger" },
  ];

  const tiles = [
    { label: "Active Employees", sub: "Operational workforce", value: o.activeEmployees, icon: Users, iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
    { label: "Present Today", sub: "Active floor coverage", value: o.presentToday, icon: UserCheck, iconBg: "bg-success-bg text-success" },
    { label: "Payroll Est. (Monthly)", sub: "Gross payout projected", value: inrWhole(o.monthlyPayrollEstimate), icon: Wallet, iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
    { label: "Active Divisions", sub: "Departments", value: o.activeDivisions, icon: Building2, iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              HRMS Command Center
            </div>
            <h2 className="text-lg font-bold text-foreground">HR &amp; Payroll</h2>
            <p className="text-xs text-muted-foreground">{todayLabel}</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {heroStats.map((s) => (
              <div key={s.label}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={cn("text-base font-bold", s.valueClass)}>{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((w, idx) => (
          <Card
            key={w.label}
            className={cn(CARD_HOVER, "animate-in fade-in slide-in-from-top-1 duration-150 ease-out")}
            style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
          >
            <CardContent className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">{w.label}</p>
                  <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">{w.value}</p>
                </div>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", w.iconBg)}>
                  <w.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {w.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Attendance Analytics &amp; Daily Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-5 p-4 pt-0">
            <div
              className="relative h-28 w-28 shrink-0 rounded-full"
              style={{ background: `conic-gradient(hsl(var(--success)) ${o.attendancePct}%, hsl(var(--muted)) ${o.attendancePct}% 100%)` }}
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
                <span className="text-lg font-bold text-foreground">{o.attendancePct}%</span>
                <span className="text-[9px] uppercase text-muted-foreground">Attendance</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-success-bg px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <div>
                    <p className="font-medium text-foreground">Present</p>
                    <p className="text-xs text-muted-foreground">Checked-in &amp; working</p>
                  </div>
                </div>
                <span className="font-bold text-success">{o.presentToday}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-danger-bg px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-danger" />
                  <div>
                    <p className="font-medium text-foreground">Absent</p>
                    <p className="text-xs text-muted-foreground">Unexcused / missed check-in</p>
                  </div>
                </div>
                <span className="font-bold text-danger">{o.absentToday}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-info-bg px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-info" />
                  <div>
                    <p className="font-medium text-foreground">On Leave</p>
                    <p className="text-xs text-muted-foreground">Approved time-off</p>
                  </div>
                </div>
                <span className="font-bold text-info">{o.onLeaveToday}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <HandCoins className="h-4 w-4 text-muted-foreground" />
              Loan &amp; Advances Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="rounded-lg bg-muted/50 p-3.5">
              <p className="text-xs font-medium uppercase text-muted-foreground">Total Outstanding Portfolio</p>
              <p className="mt-0.5 text-xl font-bold text-foreground">{inrWhole(o.loanPortfolio.totalOutstanding)}</p>
              <Badge tone="info" className="mt-2">
                {o.loanPortfolio.activeAgreements} Active Agreements
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Loan Agreements</span>
              <span className="font-medium text-foreground">{o.loanPortfolio.activeAgreements}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending Approval Queue</span>
              <Badge tone={o.loanPortfolio.pendingApprovals > 0 ? "danger" : "muted"}>{o.loanPortfolio.pendingApprovals} requests</Badge>
            </div>
            <Button
              size="sm"
              className="w-full bg-teal-600 text-white hover:bg-teal-700 hover:opacity-100"
              onClick={() => navigate("/hrms/loans")}
            >
              Access Loan Officer Portal
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Department Headcounts
            </CardTitle>
            <CardDescription className="text-xs">{o.activeEmployees} active employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 p-4 pt-0">
            {o.headcountByDepartment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees yet.</p>
            ) : (
              o.headcountByDepartment.map((d, idx) => (
                <div key={d.department} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{d.department}</span>
                    <span className="text-muted-foreground">{d.count} staff</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500 ease-out", ROW_TONES[idx % ROW_TONES.length])}
                      style={{ width: `${(d.count / maxDept) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Annual Leave Balance Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-4 pt-0">
            {o.leaveBalanceSnapshot.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave balances allocated yet.</p>
            ) : (
              o.leaveBalanceSnapshot.map((l) => {
                const pct = l.allocatedDays > 0 ? Math.min(100, Math.round((l.usedDays / l.allocatedDays) * 100)) : 0;
                return (
                  <div key={l.leaveTypeName} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.leaveTypeName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {l.usedDays} Used / {l.allocatedDays} Allocated ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: l.color }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                Newly Onboarded Workforce
              </CardTitle>
              <CardDescription className="text-xs">Recent additions to the staff registry</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/hrms/employees")}>
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {o.recentJoiners.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new joiners yet.</p>
            ) : (
              <div className="space-y-2">
                {o.recentJoiners.map((e, idx) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={AVATAR_TONES[idx % AVATAR_TONES.length]}>{initials(e.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{e.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.designation} · {e.employeeCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">{inrWhole(e.monthlyGrossSalary)}</span>
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              Action Matrix Command
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-3.5 text-center text-xs font-medium text-foreground",
                    CARD_HOVER,
                  )}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", a.iconBg)}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  {a.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingApprovals > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          {pendingApprovals} pending approvals across leave, loans, salary revisions and incentives
        </div>
      )}
    </div>
  );
}
