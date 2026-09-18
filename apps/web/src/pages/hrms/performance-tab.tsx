import { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Award, ChevronDown, ChevronUp, Gift, ListChecks, Target } from "lucide-react";
import { Button, Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, Incentive, PerformanceGoal, PerformanceReview } from "./types";
import { inr } from "./hrms-helpers";
import KpiTemplatesPanel from "./kpi-templates-panel";
import IncentiveMatrixPanel from "./incentive-matrix-panel";
import PendingPayoutsPanel from "./pending-payouts-panel";
import ManagerReviewsPanel from "./manager-reviews-panel";
import EmployeeGoalsPanel from "./employee-goals-panel";

const SUMMARY_QUERY = gql`
  query PerformanceIncentivesSummary {
    incentives {
      id
      amount
      status
    }
    performanceReviews {
      id
      status
    }
    performanceGoals(status: "ACTIVE") {
      id
    }
  }
`;

const TOP_TABS = [
  { key: "dashboard", label: "HR Dashboard" },
  { key: "manager", label: "Manager Reviews Portal" },
  { key: "employee", label: "Employee Goals Portal" },
] as const;

export default function PerformanceTab({ employees, loading: _shellLoading }: { employees: EmployeeLite[]; loading: boolean }) {
  const { data } = useQuery<{ incentives: Incentive[]; performanceReviews: PerformanceReview[]; performanceGoals: PerformanceGoal[] }>(SUMMARY_QUERY);
  const [topTab, setTopTab] = useState<(typeof TOP_TABS)[number]["key"]>("dashboard");
  const [subTab, setSubTab] = useState("kpi");
  const [summaryVisible, setSummaryVisible] = useState(true);

  const incentives = data?.incentives ?? [];
  const reviews = data?.performanceReviews ?? [];
  const goals = data?.performanceGoals ?? [];

  const totalApprovedPayouts = incentives.filter((i) => i.status === "APPROVED" || i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const pendingApprovals = incentives.filter((i) => i.status === "PENDING").length;
  const completedReviews = reviews.filter((r) => r.status === "SUBMITTED" || r.status === "ACKNOWLEDGED" || r.status === "CLOSED").length;
  const trackedGoals = goals.length;

  const stats = [
    { label: "Total Approved Payouts", value: inr(totalApprovedPayouts), hint: "injected to payroll", icon: Award, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Pending Approvals", value: pendingApprovals, hint: "requires review", icon: Gift, borderClass: "border-l-warning", iconBg: "bg-warning-bg text-warning" },
    { label: "Completed Reviews", value: completedReviews, hint: "appraisals this year", icon: ListChecks, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
    { label: "Tracked Goals", value: trackedGoals, hint: "currently active", icon: Target, borderClass: "border-l-info", iconBg: "bg-info-bg text-info" },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={topTab} onValueChange={(v) => setTopTab(v as (typeof TOP_TABS)[number]["key"])}>
        <TabsList>
          {TOP_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setSummaryVisible((v) => !v)} className={cn("gap-1.5", BUTTON_PRESS)}>
              {summaryVisible ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {summaryVisible ? "Hide Summary" : "Show Summary"}
            </Button>
          </div>

          {summaryVisible && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((w) => (
                <Card key={w.label} className={cn(CARD_HOVER, "border-l-4", w.borderClass)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{w.label}</p>
                        <p className="text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                        <p className="text-xs text-muted-foreground">{w.hint}</p>
                      </div>
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", w.iconBg)}>
                        <w.icon className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList>
              <TabsTrigger value="kpi">KPI &amp; Goal Configurations</TabsTrigger>
              <TabsTrigger value="matrix">Incentive Matrix Rules</TabsTrigger>
              <TabsTrigger value="payouts">
                Pending Payout Approvals{pendingApprovals > 0 ? ` (${pendingApprovals})` : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="kpi">
              <KpiTemplatesPanel />
            </TabsContent>
            <TabsContent value="matrix">
              <IncentiveMatrixPanel />
            </TabsContent>
            <TabsContent value="payouts">
              <PendingPayoutsPanel employees={employees} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="manager">
          <ManagerReviewsPanel employees={employees} />
        </TabsContent>

        <TabsContent value="employee">
          <EmployeeGoalsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
