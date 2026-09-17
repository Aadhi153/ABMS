import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { CalendarClock, ChevronDown, ChevronUp, PieChart, TrendingDown, Users } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, LeaveBalance, LeaveType } from "./types";

const BALANCES_QUERY = gql`
  query LeaveBalancesData($year: Int) {
    leaveTypes {
      id
      name
      code
    }
    leaveBalances(year: $year) {
      id
      employeeId
      employeeName
      department
      leaveTypeId
      leaveTypeName
      year
      allocatedDays
      usedDays
      remainingDays
    }
  }
`;
const BULK_ALLOCATE = gql`
  mutation BulkAllocateLeaveBalanceTab($input: BulkAllocateLeaveBalanceInput!) {
    bulkAllocateLeaveBalance(input: $input)
  }
`;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export default function LeaveBalancesTab({ employees }: { employees: EmployeeLite[] }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ leaveTypeId: "", year: CURRENT_YEAR, department: "ALL", overrideDays: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useQuery<{ leaveTypes: LeaveType[]; leaveBalances: LeaveBalance[] }>(BALANCES_QUERY, { variables: { year } });
  const [bulkAllocate] = useMutation(BULK_ALLOCATE);

  const leaveTypes = data?.leaveTypes ?? [];
  const balances = data?.leaveBalances ?? [];

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(), [employees]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { employeeId: string; employeeName: string; department: string | null; byType: Record<string, LeaveBalance> }>();
    for (const b of balances) {
      if (!map.has(b.employeeId)) map.set(b.employeeId, { employeeId: b.employeeId, employeeName: b.employeeName, department: b.department, byType: {} });
      map.get(b.employeeId)!.byType[b.leaveTypeId] = b;
    }
    return Array.from(map.values()).filter((row) => {
      if (deptFilter !== "ALL" && row.department !== deptFilter) return false;
      if (search && !row.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [balances, deptFilter, search]);

  async function handleBulkAllocate() {
    if (!bulkForm.leaveTypeId) {
      toast.error("Select a leave type");
      return;
    }
    setSubmitting(true);
    try {
      const res = await bulkAllocate({
        variables: {
          input: {
            leaveTypeId: bulkForm.leaveTypeId,
            year: bulkForm.year,
            department: bulkForm.department === "ALL" ? undefined : bulkForm.department,
            overrideDays: bulkForm.overrideDays ? Number(bulkForm.overrideDays) : undefined,
          },
        },
      });
      toast.success(`Allocated balances for ${res.data?.bulkAllocateLeaveBalance ?? 0} employees`);
      setBulkOpen(false);
      setBulkForm({ leaveTypeId: "", year: CURRENT_YEAR, department: "ALL", overrideDays: "" });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to allocate balances");
    } finally {
      setSubmitting(false);
    }
  }

  const allocatedTotal = balances.reduce((s, b) => s + b.allocatedDays, 0);
  const consumedTotal = balances.reduce((s, b) => s + b.usedDays, 0);
  const remainingTotal = balances.reduce((s, b) => s + b.remainingDays, 0);

  const stats = [
    { label: "Staff Logged", sub: "with balances allocated", value: byEmployee.length, icon: Users, color: "text-primary" },
    { label: "Allocated Days", sub: "total days granted", value: allocatedTotal, icon: PieChart, color: "text-info" },
    { label: "Consumed Days", sub: "days utilized by staff", value: consumedTotal, icon: TrendingDown, color: "text-danger" },
    { label: "Remaining Pool", sub: "total leaves remaining", value: Math.round(remainingTotal * 10) / 10, icon: CalendarClock, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowSummary((s) => !s)} className={cn("gap-1.5", BUTTON_PRESS)}>
          {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSummary ? "Hide Summary" : "Show Summary"}
        </Button>
        <Button onClick={() => setBulkOpen(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
          <PieChart className="h-4 w-4" />
          Bulk Allocate Balance
        </Button>
      </div>

      {showSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((w) => (
            <Card key={w.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{w.label}</p>
                  <w.icon className={cn("h-4 w-4 shrink-0", w.color)} />
                </div>
                <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                <p className="text-xs text-muted-foreground">{w.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input placeholder="Search employees…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="flex items-center gap-2">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-muted/30 px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  {leaveTypes.map((t) => (
                    <th key={t.id} className="whitespace-nowrap px-4 py-2.5 text-center font-medium">
                      {t.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && byEmployee.length === 0 && (
                  <tr>
                    <td colSpan={2 + leaveTypes.length} className="px-4 py-10 text-center text-muted-foreground">
                      No leave balances found.
                    </td>
                  </tr>
                )}
                {byEmployee.map((row) => (
                  <tr key={row.employeeId} className="border-b border-border last:border-0">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium text-foreground">{row.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.department ?? "—"}</td>
                    {leaveTypes.map((t) => {
                      const b = row.byType[t.id];
                      if (!b) return (
                        <td key={t.id} className="px-4 py-2.5 text-center text-muted-foreground">
                          —
                        </td>
                      );
                      const pct = b.allocatedDays > 0 ? Math.min(100, Math.round((b.usedDays / b.allocatedDays) * 100)) : 0;
                      return (
                        <td key={t.id} className="px-4 py-2.5 text-center">
                          <p className={cn("font-medium", b.remainingDays < 0 ? "text-danger" : "text-foreground")}>
                            {b.remainingDays} / {b.allocatedDays}
                          </p>
                          <div className="mx-auto mt-1 h-1 w-14 overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full", pct >= 100 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-success")} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{b.usedDays} consumed</p>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Leave Allocation</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-muted-foreground">Assign leave balances to multiple employees at once.</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Leave Type *</Label>
              <Select value={bulkForm.leaveTypeId} onValueChange={(v) => setBulkForm({ ...bulkForm, leaveTypeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={String(bulkForm.year)} onValueChange={(v) => setBulkForm({ ...bulkForm, year: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department (optional)</Label>
              <Select value={bulkForm.department} onValueChange={(v) => setBulkForm({ ...bulkForm, department: v })}>
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>Override Days (optional)</Label>
              <Input
                type="number"
                min="0"
                placeholder="Default"
                value={bulkForm.overrideDays}
                onChange={(e) => setBulkForm({ ...bulkForm, overrideDays: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleBulkAllocate} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Allocating…" : "Allocate Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
