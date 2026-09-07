import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  IdCard,
  Pencil,
  Plus,
  Search,
  Settings2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  cn,
} from "@abms/ui";
import { FormBreadcrumb } from "../products/form-page";
import { BUTTON_PRESS } from "../products/form-motion";
import type { Employee, EmployeeLite } from "./types";
import { fmtDate, inr, titleCase } from "./hrms-helpers";
import DepartmentsTab from "./departments-tab";
import DesignationsTab from "./designations-tab";
import GradesTab from "./grades-tab";

const EMPLOYEES_QUERY = gql`
  query EmployeesTabData {
    employees {
      id
      employeeCode
      fullName
      email
      department
      designation
      employmentType
      status
      dateOfJoining
      monthlyGrossSalary
    }
  }
`;

type SortKey = "employeeCode" | "fullName" | "department" | "designation" | "dateOfJoining";
type SubTab = "employees" | "departments" | "designations" | "grades";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "employees", label: "Employees" },
  { key: "departments", label: "Departments" },
  { key: "designations", label: "Designations" },
  { key: "grades", label: "Grades" },
];

export default function EmployeesTab(_props: { employees: EmployeeLite[]; loading: boolean; onRefetch: () => void }) {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<SubTab>("employees");
  const { data, loading } = useQuery<{ employees: Employee[] }>(EMPLOYEES_QUERY, { skip: subTab !== "employees" });
  const employees = data?.employees ?? [];

  const [summaryVisible, setSummaryVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ email: true, type: true });

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = employees.filter((e) => {
    if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
    if (deptFilter !== "ALL" && e.department !== deptFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q)
    );
  });

  const sorted = filtered.slice().sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "employeeCode":
        return a.employeeCode.localeCompare(b.employeeCode) * dir;
      case "department":
        return a.department.localeCompare(b.department) * dir;
      case "designation":
        return a.designation.localeCompare(b.designation) * dir;
      case "dateOfJoining":
        return (new Date(a.dateOfJoining).getTime() - new Date(b.dateOfJoining).getTime()) * dir;
      case "fullName":
      default:
        return a.fullName.localeCompare(b.fullName) * dir;
    }
  });

  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const totalSalaryBase = employees.filter((e) => e.status === "ACTIVE").reduce((s, e) => s + e.monthlyGrossSalary, 0);
  const stats = [
    { label: "Total Registered", value: employees.length, caption: "all-time records", icon: Users, color: "text-primary" },
    {
      label: "Active Employees",
      value: employees.filter((e) => e.status === "ACTIVE").length,
      caption: "operational headcounts",
      icon: UserCheck,
      color: "text-success",
    },
    {
      label: "New Joinees",
      value: employees.filter((e) => new Date(e.dateOfJoining) >= thisMonthStart).length,
      caption: "onboarded this month",
      icon: UserPlus,
      color: "text-info",
    },
    {
      label: "Monthly Salary Base",
      value: inr(totalSalaryBase),
      caption: "estimated basic payroll",
      icon: Wallet,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormBreadcrumb items={[{ label: "HRMS", to: "/hrms/overview" }, { label: "Employee Management" }]} />
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Employee Management</h1>
          {subTab === "employees" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSummaryVisible((v) => !v)} className={cn("gap-1.5", BUTTON_PRESS)}>
                {summaryVisible ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {summaryVisible ? "Hide Summary" : "Show Summary"}
              </Button>
              <Button onClick={() => navigate("/hrms/employees/new")} className={cn("gap-1.5", BUTTON_PRESS)}>
                <Plus className="h-4 w-4" />
                New Employee
              </Button>
            </div>
          )}
        </div>
      </div>

      {subTab === "departments" && <DepartmentsTab />}
      {subTab === "designations" && <DesignationsTab />}
      {subTab === "grades" && <GradesTab />}

      {subTab === "employees" && (
        <>
          {summaryVisible && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((w, idx) => (
                <Card
                  key={w.label}
                  className="animate-in fade-in slide-in-from-top-1 border-border duration-150 ease-out transition-shadow hover:shadow-md"
                  style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{w.label}</p>
                      <w.icon className={cn("h-4 w-4 shrink-0", w.color)} />
                    </div>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{w.caption}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 pl-8" />
                  </div>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="TERMINATED">Terminated</SelectItem>
                      <SelectItem value="RESIGNED">Resigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground">
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["email", "type"] as const).map((col) => (
                      <DropdownMenuItem
                        key={col}
                        onSelect={(e) => {
                          e.preventDefault();
                          setVisibleCols((v) => ({ ...v, [col]: !v[col] }));
                        }}
                      >
                        <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                        {col === "email" ? "Email" : "Employment Type"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="w-10 px-4 py-2.5 font-medium">#</th>
                      <SortHeader label="Code" k="employeeCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Name" k="fullName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.email && <th className="px-4 py-2.5 font-medium">Email</th>}
                      <SortHeader label="Department" k="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Designation" k="designation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.type && <th className="px-4 py-2.5 font-medium">Employment Type</th>}
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <SortHeader label="Joined" k="dateOfJoining" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="w-10 px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && sorted.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                          <IdCard className="mx-auto mb-2 h-6 w-6 opacity-50" />
                          No employees found.
                        </td>
                      </tr>
                    )}
                    {sorted.map((e, idx) => (
                      <tr
                        key={e.id}
                        className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                        style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                      >
                        <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => navigate(`/hrms/employees/${e.id}`)}
                            className="font-mono text-xs font-medium text-primary transition-colors hover:underline"
                          >
                            {e.employeeCode}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 cursor-pointer font-medium text-foreground" onClick={() => navigate(`/hrms/employees/${e.id}`)}>
                          {e.fullName}
                        </td>
                        {visibleCols.email && <td className="px-4 py-2.5 text-muted-foreground">{e.email}</td>}
                        <td className="px-4 py-2.5">{e.department}</td>
                        <td className="px-4 py-2.5">{e.designation}</td>
                        {visibleCols.type && <td className="px-4 py-2.5 text-muted-foreground">{titleCase(e.employmentType)}</td>}
                        <td className="px-4 py-2.5">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(e.dateOfJoining)}</td>
                        <td className="px-4 py-2.5">
                          <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => navigate(`/hrms/employees/${e.id}`)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button className={cn("flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground", active && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        {active ? sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
  );
}
