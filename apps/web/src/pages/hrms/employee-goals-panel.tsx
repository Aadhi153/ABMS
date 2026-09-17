import { useMemo, useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Card, CardContent, cn } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { PerformanceGoal } from "./types";

const GOALS_QUERY = gql`
  query EmployeeGoalsPanelData {
    performanceGoals(status: "ACTIVE") {
      id
      employeeId
      employeeName
      branchId
      branchName
      kpiTemplateTitle
      targetName
      period
      weightagePct
      status
    }
  }
`;

type ViewMode = "branch" | "employee";

export default function EmployeeGoalsPanel() {
  const { data, loading } = useQuery<{ performanceGoals: PerformanceGoal[] }>(GOALS_QUERY);
  const [mode, setMode] = useState<ViewMode>("branch");

  const goals = data?.performanceGoals ?? [];

  const groups = useMemo(() => {
    const key = mode === "branch" ? (g: PerformanceGoal) => g.branchName ?? "Unassigned Branch" : (g: PerformanceGoal) => g.employeeName;
    const map = new Map<string, PerformanceGoal[]>();
    for (const g of goals) {
      const k = key(g);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(g);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [goals, mode]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-end gap-2 p-4">
          <div className="flex rounded-lg bg-muted p-1">
            {(["branch", "employee"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  BUTTON_PRESS,
                  mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "branch" ? "Branch-Based" : "Employee-Based"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!loading && groups.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">No active goals assigned yet.</CardContent>
        </Card>
      )}

      {groups.map(([groupName, groupGoals], gi) => (
        <Card
          key={groupName}
          className="animate-in fade-in slide-in-from-top-1 duration-150 ease-out"
          style={{ animationDelay: `${gi * 30}ms`, animationFillMode: "backwards" }}
        >
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{groupName}</p>
              <p className="text-xs text-muted-foreground">
                {groupGoals.length} goal{groupGoals.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    {mode === "branch" && <th className="px-2 py-2 font-medium">Employee</th>}
                    <th className="px-2 py-2 font-medium">KPI template</th>
                    <th className="px-2 py-2 font-medium">Target</th>
                    <th className="px-2 py-2 font-medium">Period</th>
                    <th className="px-2 py-2 font-medium text-right">Weightage</th>
                  </tr>
                </thead>
                <tbody>
                  {groupGoals.map((g) => (
                    <tr key={g.id} className="border-b border-border last:border-0">
                      {mode === "branch" && <td className="px-2 py-2 font-medium text-foreground">{g.employeeName}</td>}
                      <td className="px-2 py-2 text-muted-foreground">{g.kpiTemplateTitle}</td>
                      <td className="px-2 py-2 text-muted-foreground">{g.targetName ?? "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">{g.period}</td>
                      <td className="px-2 py-2 text-right font-medium text-primary">{g.weightagePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
