import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import type { EmployeeLite } from "./types";
import OverviewTab from "./overview-tab";
import EmployeesTab from "./employees-tab";
import AttendanceTab from "./attendance-tab";
import ShiftsTab from "./shifts-tab";
import LeaveTab from "./leave-tab";
import AllowancesTab from "./allowances-tab";
import PromotionsTab from "./promotions-tab";
import LoansTab from "./loans-tab";
import PerformanceTab from "./performance-tab";
import PayrollTab from "./payroll-tab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "employees", label: "Employee Management" },
  { key: "attendance", label: "Attendance Management" },
  { key: "shifts", label: "Shift Management" },
  { key: "leave", label: "Leave Management" },
  { key: "allowances", label: "Allowance & Deduction" },
  { key: "promotions", label: "Promotion & Salary Increment" },
  { key: "loans", label: "Loans" },
  { key: "performance", label: "Performance & Incentives" },
  { key: "payroll", label: "Payroll & Payslips" },
] as const;

const SHELL_QUERY = gql`
  query HrmsShellData {
    employees {
      id
      employeeCode
      fullName
      department
      designation
      status
      avatarUrl
    }
  }
`;

export default function HrmsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "overview";

  useEffect(() => {
    if (!TABS.some((t) => t.key === segment)) {
      navigate(`/hrms/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate]);

  const { data, loading, refetch } = useQuery<{ employees: EmployeeLite[] }>(SHELL_QUERY);
  const employees = data?.employees ?? [];

  return (
    <div className="space-y-6">
      {tab !== "attendance" && tab !== "employees" && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">HRMS</h1>
          <p className="text-sm text-muted-foreground">Employees, attendance, leave, payroll, and everything in between.</p>
        </div>
      )}

      {tab === "overview" && <OverviewTab />}
      {tab === "employees" && <EmployeesTab employees={employees} loading={loading} onRefetch={refetch} />}
      {tab === "attendance" && <AttendanceTab employees={employees} loading={loading} />}
      {tab === "shifts" && <ShiftsTab employees={employees} loading={loading} />}
      {tab === "leave" && <LeaveTab employees={employees} loading={loading} />}
      {tab === "allowances" && <AllowancesTab employees={employees} loading={loading} />}
      {tab === "promotions" && <PromotionsTab employees={employees} loading={loading} />}
      {tab === "loans" && <LoansTab employees={employees} loading={loading} />}
      {tab === "performance" && <PerformanceTab employees={employees} loading={loading} />}
      {tab === "payroll" && <PayrollTab employees={employees} loading={loading} />}
    </div>
  );
}
