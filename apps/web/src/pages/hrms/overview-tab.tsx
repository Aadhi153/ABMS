import { gql, useQuery } from "@apollo/client";
import { AlertCircle, Building2, CalendarCheck, CalendarClock, TrendingUp, UserCheck, UserPlus, Users, Wallet } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, StatusBadge, cn } from "@abms/ui";
import { CARD_HOVER } from "../products/form-motion";
import type { HrmsOverview } from "./types";
import { fmtDate, monthLabel } from "./hrms-helpers";

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
      upcomingPayrollRun {
        id
        month
        year
        status
        payslipCount
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
        dateOfJoining
      }
      recentPayrollRuns {
        id
        month
        year
        status
        totalNet
      }
    }
  }
`;

export default function OverviewTab() {
  const { data, loading } = useQuery<{ hrmsOverview: HrmsOverview }>(OVERVIEW_QUERY);
  const o = data?.hrmsOverview;

  if (loading && !o) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!o) return null;

  const pendingApprovals = o.pendingLeaveRequests + o.pendingLoanApprovals + o.pendingSalaryRevisions + o.pendingIncentiveApprovals;

  const tiles = [
    { label: "Total Employees", value: o.totalEmployees, icon: Users, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Present Today", value: o.presentToday, icon: UserCheck, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
    { label: "On Leave Today", value: o.onLeaveToday, icon: CalendarClock, borderClass: "border-l-warning", iconBg: "bg-warning-bg text-warning" },
    { label: "Pending Approvals", value: pendingApprovals, icon: AlertCircle, borderClass: "border-l-danger", iconBg: "bg-danger-bg text-danger" },
  ];

  const maxDept = Math.max(1, ...o.headcountByDepartment.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((w, idx) => (
          <Card
            key={w.label}
            className={cn(CARD_HOVER, "border-l-4 animate-in fade-in slide-in-from-top-1 duration-150 ease-out", w.borderClass)}
            style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{w.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                </div>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", w.iconBg)}>
                  <w.icon className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Headcount by department
            </CardTitle>
            <CardDescription>{o.activeEmployees} active employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {o.headcountByDepartment.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees yet.</p>
            ) : (
              o.headcountByDepartment.map((d) => (
                <div key={d.department} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{d.department}</span>
                    <span className="text-muted-foreground">{d.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${(d.count / maxDept) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Payroll
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {o.upcomingPayrollRun ? (
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{monthLabel(o.upcomingPayrollRun.month, o.upcomingPayrollRun.year)}</span>
                  <StatusBadge status={o.upcomingPayrollRun.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{o.upcomingPayrollRun.payslipCount} payslips</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming payroll run.</p>
            )}
            {o.recentPayrollRuns.length > 0 && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Recent runs</p>
                {o.recentPayrollRuns.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{monthLabel(r.month, r.year)}</span>
                    <Badge tone={r.status === "PAID" ? "success" : "muted"}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Recent joiners
          </CardTitle>
          <CardDescription>New employees in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {o.recentJoiners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new joiners in the last 30 days.</p>
          ) : (
            <div className="space-y-2">
              {o.recentJoiners.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{e.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.designation} · {e.department}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {fmtDate(e.dateOfJoining)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarCheck className="h-3.5 w-3.5" />
        {o.absentToday} absent today
      </div>
    </div>
  );
}
