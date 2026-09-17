import { useState } from "react";
import { cn } from "@abms/ui";
import { FormBreadcrumb } from "../products/form-page";
import type { EmployeeLite } from "./types";
import LeaveEntryTab from "./leave-entry-tab";
import LeaveBalancesTab from "./leave-balances-tab";
import LeavePolicyTab from "./leave-policy-tab";
import LeaveHolidaysTab from "./leave-holidays-tab";
import LeaveCalendarTab from "./leave-calendar-tab";

type SubTab = "entry" | "balances" | "policy" | "holidays" | "calendar";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "entry", label: "Leave Entry" },
  { key: "balances", label: "Balances" },
  { key: "policy", label: "Leave Policy" },
  { key: "holidays", label: "Holidays" },
  { key: "calendar", label: "Calendar" },
];

export default function LeaveTab({ employees }: { employees: EmployeeLite[]; loading: boolean }) {
  const [subTab, setSubTab] = useState<SubTab>("entry");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormBreadcrumb items={[{ label: "HR & Payroll", to: "/hrms/overview" }, { label: "Leave Command Center" }]} />
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Leave Management</h1>
        </div>
      </div>

      {subTab === "entry" && <LeaveEntryTab employees={employees} />}
      {subTab === "balances" && <LeaveBalancesTab employees={employees} />}
      {subTab === "policy" && <LeavePolicyTab employees={employees} />}
      {subTab === "holidays" && <LeaveHolidaysTab />}
      {subTab === "calendar" && <LeaveCalendarTab />}
    </div>
  );
}
