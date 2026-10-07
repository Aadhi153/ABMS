import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Download,
  Eye,
  IdCard,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { FormBreadcrumb } from "../products/form-page";
import { BUTTON_PRESS } from "../products/form-motion";
import type { Employee, EmployeeLite } from "./types";
import { fmtDate, inr, titleCase } from "./hrms-helpers";
import DepartmentsTab from "./departments-tab";
import DesignationsTab from "./designations-tab";
import GradesTab from "./grades-tab";
import BranchesTab from "./branches-tab";
import { EmployeeEditPanel } from "./employee-edit-panel";

const EMPLOYEES_QUERY = gql`
  query EmployeesTabData {
    employees {
      id
      employeeCode
      fullName
      email
      phone
      department
      designation
      employmentType
      status
      dateOfJoining
      monthlyGrossSalary
      branchId
      branchName
    }
    branches {
      id
      name
    }
  }
`;

const UPDATE_EMPLOYEE_STATUS = gql`
  mutation UpdateEmployeeStatusBulk($id: String!, $status: String!) {
    updateEmployeeStatus(id: $id, status: $status) {
      id
    }
  }
`;

const UPDATE_EMPLOYEE_BRANCH = gql`
  mutation UpdateEmployeeBranchBulk($id: String!, $branchId: String!) {
    updateEmployeeBranch(id: $id, branchId: $branchId) {
      id
    }
  }
`;

const DELETE_EMPLOYEE = gql`
  mutation DeleteEmployeeBulk($id: String!) {
    deleteEmployee(id: $id)
  }
`;

type SortKey = "employeeCode" | "fullName" | "department" | "designation" | "dateOfJoining";
type SubTab = "employees" | "departments" | "designations" | "grades" | "branches";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "employees", label: "Employees" },
  { key: "departments", label: "Departments" },
  { key: "designations", label: "Designations" },
  { key: "grades", label: "Grades" },
  { key: "branches", label: "Branches" },
];

const STATUS_OPTIONS = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "RESIGNED"];
const EMPLOYMENT_TYPE_OPTIONS = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "PROBATION"];
const PAGE_SIZES = [10, 25, 50, 100];
const AVATAR_TONES = [
  { bg: "bg-primary-bg", text: "text-primary" },
  { bg: "bg-success-bg", text: "text-success" },
  { bg: "bg-info-bg", text: "text-info" },
  { bg: "bg-warning-bg", text: "text-warning" },
  { bg: "bg-danger-bg", text: "text-danger" },
];
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarTone(name: string) {
  const sum = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  const keep = new Set<number>();
  for (let p = 1; p <= Math.min(3, total); p++) keep.add(p);
  if (total >= 1) keep.add(total);
  for (let p = current - 1; p <= current + 1; p++) if (p >= 1 && p <= total) keep.add(p);
  const sorted = Array.from(keep).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export default function EmployeesTab(_props: { employees: EmployeeLite[]; loading: boolean; onRefetch: () => void }) {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<SubTab>("employees");
  const { data, loading, refetch } = useQuery<{ employees: Employee[]; branches: { id: string; name: string }[] }>(EMPLOYEES_QUERY, {
    skip: subTab !== "employees",
  });
  const [updateStatus] = useMutation(UPDATE_EMPLOYEE_STATUS);
  const [updateBranch] = useMutation(UPDATE_EMPLOYEE_BRANCH);
  const [deleteEmployee] = useMutation(DELETE_EMPLOYEE);
  const employees = data?.employees ?? [];
  const branches = data?.branches ?? [];
  const [quickViewEmployee, setQuickViewEmployee] = useState<Employee | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);

  const [summaryVisible, setSummaryVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ type: true });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[] | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

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
    if (typeFilter !== "ALL" && e.employmentType !== typeFilter) return false;
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

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, deptFilter, typeFilter, sortKey, sortDir, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageStart = (page - 1) * pageSize;
  const paged = sorted.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setSelected((prev) => {
      const visibleIds = new Set(paged.map((e) => e.id));
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, deptFilter, typeFilter]);

  const allPagedSelected = paged.length > 0 && paged.every((e) => selected.has(e.id));

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPagedSelected) {
        paged.forEach((e) => next.delete(e.id));
      } else {
        paged.forEach((e) => next.add(e.id));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSetStatus(ids: string[], status: string) {
    setActionBusy(true);
    try {
      await Promise.all(ids.map((id) => updateStatus({ variables: { id, status } })));
      toast.success(`Updated status for ${ids.length} employee${ids.length === 1 ? "" : "s"}`);
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAssignBranch(ids: string[], branchId: string) {
    setActionBusy(true);
    try {
      await Promise.all(ids.map((id) => updateBranch({ variables: { id, branchId } })));
      toast.success(`Assigned branch for ${ids.length} employee${ids.length === 1 ? "" : "s"}`);
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign branch");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTargetIds) return;
    setActionBusy(true);
    try {
      await Promise.all(deleteTargetIds.map((id) => deleteEmployee({ variables: { id } })));
      toast.success(`Deleted ${deleteTargetIds.length} employee${deleteTargetIds.length === 1 ? "" : "s"}`);
      setSelected((prev) => {
        const next = new Set(prev);
        deleteTargetIds.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteTargetIds(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete employees");
    } finally {
      setActionBusy(false);
    }
  }

  function handleExportCsv() {
    const header = ["Code", "Name", "Email", "Department", "Designation", "Employment Type", "Status", "Joined"];
    const rows = sorted.map((e) => [
      e.employeeCode,
      e.fullName,
      e.email,
      e.department,
      e.designation,
      titleCase(e.employmentType),
      titleCase(e.status),
      fmtDate(e.dateOfJoining),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
  const newJoineesCount = employees.filter((e) => new Date(e.dateOfJoining) >= thisMonthStart).length;
  const totalSalaryBase = employees.filter((e) => e.status === "ACTIVE").reduce((s, e) => s + e.monthlyGrossSalary, 0);
  const growthPct = employees.length > newJoineesCount ? (newJoineesCount / (employees.length - newJoineesCount)) * 100 : 0;
  const activePct = employees.length > 0 ? (activeCount / employees.length) * 100 : 0;

  const stats = [
    {
      label: "Total Registered",
      value: employees.length,
      caption: "all-time employee records",
      icon: Users,
      tone: AVATAR_TONES[2],
      delta: employees.length > 0 ? `+${growthPct.toFixed(1)}% this mo` : null,
      deltaTone: "success" as const,
    },
    {
      label: "Active Employees",
      value: activeCount,
      caption: "operational headcounts",
      icon: UserCheck,
      tone: AVATAR_TONES[1],
      delta: employees.length > 0 ? `${activePct.toFixed(1)}% active rate` : null,
      deltaTone: "success" as const,
    },
    {
      label: "New Joinees",
      value: newJoineesCount,
      caption: "onboarded this month",
      icon: UserPlus,
      tone: AVATAR_TONES[0],
      delta: null,
      deltaTone: "info" as const,
    },
    {
      label: "Monthly Salary Base",
      value: inr(totalSalaryBase),
      caption: "estimated basic payroll",
      icon: Wallet,
      tone: AVATAR_TONES[3],
      delta: null,
      deltaTone: "warning" as const,
    },
  ];

  return (
    <div className="-m-3 min-h-full space-y-3 bg-background p-3 sm:-m-5 sm:p-5">
      <FormBreadcrumb items={[{ label: "HRMS", to: "/hrms/overview" }, { label: "Employee Management" }]} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Employee Management</h1>
            <p className="text-xs text-muted-foreground">
              Centralized workforce directory, access control and organization roster
            </p>
            {subTab === "employees" && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-info">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                {employees.length} Total Members
              </span>
            )}
          </div>
        </div>
        {subTab === "employees" && (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setSummaryVisible((v) => !v)} className={cn("gap-1.5", BUTTON_PRESS)}>
              {summaryVisible ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {summaryVisible ? "Collapse Metrics" : "Show Metrics"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button size="sm" onClick={() => navigate("/hrms/employees/new")} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-3.5 w-3.5" />
              Add New Employee
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              subTab === t.key ? "bg-primary-bg text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "employees" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  subTab === t.key ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {employees.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === "departments" && <DepartmentsTab />}
      {subTab === "designations" && <DesignationsTab />}
      {subTab === "grades" && <GradesTab />}
      {subTab === "branches" && <BranchesTab />}

      {subTab === "employees" && (
        <>
          {summaryVisible && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {stats.map((w, idx) => (
                <Card
                  key={w.label}
                  className="animate-in fade-in duration-150 ease-out"
                  style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.03em] text-muted-foreground">{w.label}</p>
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", w.tone.bg)}>
                        <w.icon className={cn("h-3 w-3", w.tone.text)} />
                      </div>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <p className="text-lg font-bold tracking-tight text-foreground">{w.value}</p>
                      {w.delta && (
                        <Badge tone={w.deltaTone} className="px-1.5 py-0 text-[10px]">
                          {w.delta}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 border-t border-border pt-1">
                      <p className="text-[10px] text-muted-foreground">{w.caption}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, code, email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-64 pl-8 text-sm"
                  />
                </div>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-9 w-40 text-sm">
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
                  <SelectTrigger className="h-9 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {titleCase(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Employment Type</SelectItem>
                    {EMPLOYMENT_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {titleCase(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <p className="whitespace-nowrap text-xs text-muted-foreground">
                  Showing {sorted.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + pageSize, sorted.length)} of {sorted.length} results
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["type"] as const).map((col) => (
                      <DropdownMenuItem
                        key={col}
                        onSelect={(e) => {
                          e.preventDefault();
                          setVisibleCols((v) => ({ ...v, [col]: !v[col] }));
                        }}
                      >
                        <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                        Employment Type
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary-bg px-3 py-2">
              <p className="text-xs font-medium text-primary">
                {selected.size} employee{selected.size === 1 ? "" : "s"} selected
              </p>
              <div className="flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="xs" disabled={actionBusy} className={cn("gap-1.5", BUTTON_PRESS)}>
                      Set status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_OPTIONS.map((s) => (
                      <DropdownMenuItem key={s} onSelect={() => handleSetStatus(Array.from(selected), s)}>
                        {titleCase(s)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="xs" disabled={actionBusy || branches.length === 0} className={cn("gap-1.5", BUTTON_PRESS)}>
                      Assign branch
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {branches.map((b) => (
                      <DropdownMenuItem key={b.id} onSelect={() => handleAssignBranch(Array.from(selected), b.id)}>
                        {b.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={actionBusy}
                  onClick={() => setDeleteTargetIds(Array.from(selected))}
                  className={cn("gap-1.5 text-danger hover:text-danger", BUTTON_PRESS)}
                >
                  Delete
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelected(new Set())} className={cn("h-6 w-6", BUTTON_PRESS)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="w-10 px-3 py-2.5">
                        <Checkbox checked={allPagedSelected} onCheckedChange={toggleAllOnPage} aria-label="Select all on page" />
                      </th>
                      <SortHeader label="Code" k="employeeCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Employee" k="fullName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Department" k="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Designation" k="designation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.type && <th className="px-3 py-2.5 font-medium">Employment Type</th>}
                      <th className="px-3 py-2.5 font-medium">Status</th>
                      <SortHeader label="Joined" k="dateOfJoining" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-3 py-2.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {!loading && paged.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                          <IdCard className="mx-auto mb-2 h-5 w-5 opacity-50" />
                          No employees found.
                        </td>
                      </tr>
                    )}
                    {paged.map((e, idx) => {
                      const tone = avatarTone(e.fullName);
                      return (
                        <tr
                          key={e.id}
                          className="animate-in fade-in slide-in-from-top-1 duration-150 ease-out hover:bg-muted/40"
                          style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                        >
                          <td className="px-3 py-2.5">
                            <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleRow(e.id)} aria-label={`Select ${e.fullName}`} />
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => setEditEmployeeId(e.id)}
                              className="font-mono text-xs font-semibold text-primary transition-colors hover:underline"
                            >
                              {e.employeeCode}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => setEditEmployeeId(e.id)} className="flex items-center gap-2.5 text-left">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className={cn("text-[10px] font-semibold", tone.bg, tone.text)}>
                                  {initialsOf(e.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="flex flex-col">
                                <span className="text-sm font-medium leading-tight text-foreground">{e.fullName}</span>
                                <span className="text-xs leading-tight text-muted-foreground">{e.email}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-2.5">{e.department}</td>
                          <td className="px-3 py-2.5">{e.designation}</td>
                          {visibleCols.type && <td className="px-3 py-2.5 text-muted-foreground">{titleCase(e.employmentType)}</td>}
                          <td className="px-3 py-2.5">
                            <StatusBadge status={e.status} />
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(e.dateOfJoining)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7", BUTTON_PRESS)}
                                onClick={() => setQuickViewEmployee(e)}
                                aria-label={`Quick view ${e.fullName}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7", BUTTON_PRESS)}
                                onClick={() => setEditEmployeeId(e.id)}
                                aria-label={`Edit ${e.fullName}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", BUTTON_PRESS)}>
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Set status</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      {STATUS_OPTIONS.map((s) => (
                                        <DropdownMenuItem key={s} onSelect={() => handleSetStatus([e.id], s)}>
                                          {titleCase(s)}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  {branches.length > 0 && (
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>Assign branch</DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {branches.map((b) => (
                                          <DropdownMenuItem key={b.id} onSelect={() => handleAssignBranch([e.id], b.id)}>
                                            {b.name}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => setDeleteTargetIds([e.id])}
                                    className="text-danger focus:text-danger"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2.5">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Showing {sorted.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + pageSize, sorted.length)} of {sorted.length} results
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>Rows per page:</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-7 w-16 px-2 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={cn("gap-1", BUTTON_PRESS)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  {pageNumbers(page, pageCount).map((p, idx) =>
                    p === "…" ? (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                          p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className={cn("gap-1", BUTTON_PRESS)}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={deleteTargetIds !== null} onOpenChange={(o) => !o && setDeleteTargetIds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTargetIds?.length ?? 0} employee{(deleteTargetIds?.length ?? 0) === 1 ? "" : "s"}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetIds(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={actionBusy} className={BUTTON_PRESS}>
              {actionBusy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickViewEmployee !== null} onOpenChange={(o) => !o && setQuickViewEmployee(null)}>
        <DialogContent>
          {quickViewEmployee && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn("text-xs font-semibold", avatarTone(quickViewEmployee.fullName).bg, avatarTone(quickViewEmployee.fullName).text)}>
                      {initialsOf(quickViewEmployee.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    <span className="block text-sm font-semibold">{quickViewEmployee.fullName}</span>
                    <span className="block font-mono text-xs font-normal text-muted-foreground">{quickViewEmployee.employeeCode}</span>
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Status</p>
                  <StatusBadge status={quickViewEmployee.status} />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Employment Type</p>
                  <p className="text-foreground">{titleCase(quickViewEmployee.employmentType)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Department</p>
                  <p className="text-foreground">{quickViewEmployee.department}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Designation</p>
                  <p className="text-foreground">{quickViewEmployee.designation}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Branch</p>
                  <p className="text-foreground">{quickViewEmployee.branchName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Joined</p>
                  <p className="text-foreground">{fmtDate(quickViewEmployee.dateOfJoining)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Email</p>
                  <p className="truncate text-foreground">{quickViewEmployee.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Phone</p>
                  <p className="text-foreground">{quickViewEmployee.phone ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-medium uppercase text-muted-foreground">Monthly Gross Salary</p>
                  <p className="font-semibold text-foreground">{inr(quickViewEmployee.monthlyGrossSalary)}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setQuickViewEmployee(null)} className={BUTTON_PRESS}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setEditEmployeeId(quickViewEmployee.id);
                    setQuickViewEmployee(null);
                  }}
                  className={cn("gap-1.5", BUTTON_PRESS)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit full profile
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={editEmployeeId !== null} onOpenChange={(o) => !o && setEditEmployeeId(null)}>
        <SheetContent className="p-0">
          {editEmployeeId && (
            <EmployeeEditPanel id={editEmployeeId} onClose={() => setEditEmployeeId(null)} onSaved={refetch} />
          )}
        </SheetContent>
      </Sheet>
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
    <th className="px-3 py-2.5 font-medium uppercase tracking-wide">
      <button
        className={cn("flex items-center gap-1 whitespace-nowrap text-[11px] transition-colors hover:text-foreground", active && "text-foreground")}
        onClick={() => onSort(k)}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-60" />
        )}
      </button>
    </th>
  );
}
