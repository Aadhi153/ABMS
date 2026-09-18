import { useState } from "react";
import { cn } from "@abms/ui";
import { FormBreadcrumb } from "../products/form-page";
import type { EmployeeLite } from "./types";
import PromotionApprovalTab from "./promotion-approval-tab";
import SalaryIncrementTab from "./salary-increment-tab";
import PromotionHistoryTab from "./promotion-history-tab";
import SalaryHistoryTab from "./salary-history-tab";

type SubTab = "approval" | "increment" | "promotion-history" | "salary-history";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "approval", label: "Promotion Approval" },
  { key: "increment", label: "Salary Increment" },
  { key: "promotion-history", label: "Promotion History" },
  { key: "salary-history", label: "Salary History" },
];

export default function PromotionsTab({ employees }: { employees: EmployeeLite[]; loading: boolean }) {
  const [subTab, setSubTab] = useState<SubTab>("approval");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormBreadcrumb items={[{ label: "HR & Payroll", to: "/hrms/overview" }, { label: "Promotion & Salary Increment" }]} />
          <div className="flex items-center gap-4">
            {SUB_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setSubTab(t.key)}
                className={cn(
                  "border-b-2 pb-1 text-sm font-medium transition-colors",
                  subTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Promotion & Salary Increment</h1>
        </div>
      </div>

      {subTab === "approval" && <PromotionApprovalTab />}
      {subTab === "increment" && <SalaryIncrementTab employees={employees} />}
      {subTab === "promotion-history" && <PromotionHistoryTab />}
      {subTab === "salary-history" && <SalaryHistoryTab />}
    </div>
  );
}
