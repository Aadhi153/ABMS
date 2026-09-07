import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ClipboardList,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings2,
  UserX,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { FormBreadcrumb } from "../products/form-page";
import { BUTTON_PRESS } from "../products/form-motion";
import type { AttendanceLog, EmployeeLite } from "./types";
import { fmtDate, fmtTime } from "./hrms-helpers";

const ATTENDANCE_QUERY = gql`
  query AttendanceTabData {
    attendanceLogs {
      id
      employeeId
      employeeName
      employeeCode
      date
      checkIn
      checkOut
      status
      workedHours
      shiftName
      notes
    }
  }
`;
const CHECK_IN = gql`
  mutation CheckInTab($employeeId: String!) {
    checkIn(employeeId: $employeeId) {
      id
    }
  }
`;
const CHECK_OUT = gql`
  mutation CheckOutTab($employeeId: String!) {
    checkOut(employeeId: $employeeId) {
      id
    }
  }
`;
const MARK_ATTENDANCE = gql`
  mutation MarkAttendanceTab($input: MarkAttendanceInput!) {
    markAttendance(input: $input) {
      id
    }
  }
`;

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "HOLIDAY", "WEEK_OFF"];
type SortKey = "employeeName" | "date" | "status" | "workedHours";

export default function AttendanceTab({ employees, loading: employeesLoading }: { employees: EmployeeLite[]; loading: boolean }) {
  const { data, loading, refetch } = useQuery<{ attendanceLogs: AttendanceLog[] }>(ATTENDANCE_QUERY);
  const [checkIn] = useMutation(CHECK_IN);
  const [checkOut] = useMutation(CHECK_OUT);
  const [markAttendance] = useMutation(MARK_ATTENDANCE);

  const logs = data?.attendanceLogs ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysLogs = logs.filter((l) => l.date.slice(0, 10) === todayStr);

  const [summaryVisible, setSummaryVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleCols, setVisibleCols] = useState({ shift: true, notes: false });

  const [marking, setMarking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ employeeId: "", date: todayStr, status: "PRESENT", notes: "" });

  function openMark(prefill?: Partial<typeof form>) {
    setForm({ employeeId: "", date: todayStr, status: "PRESENT", notes: "", ...prefill });
    setMarking(true);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleCheckIn(employeeId: string) {
    setSubmitting(true);
    try {
      await checkIn({ variables: { employeeId } });
      toast.success("Checked in");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(employeeId: string) {
    setSubmitting(true);
    try {
      await checkOut({ variables: { employeeId } });
      toast.success("Checked out");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check out");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMark() {
    if (!form.employeeId) {
      toast.error("Select an employee");
      return;
    }
    setSubmitting(true);
    try {
      await markAttendance({ variables: { input: { employeeId: form.employeeId, date: form.date, status: form.status, notes: form.notes || undefined } } });
      toast.success("Attendance recorded");
      setMarking(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record attendance");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = [
    {
      label: "Present Today",
      value: todaysLogs.filter((l) => l.status === "PRESENT" || l.status === "LATE").length,
      caption: "checked in today",
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      label: "Absent Today",
      value: todaysLogs.filter((l) => l.status === "ABSENT").length,
      caption: "no check-in recorded",
      icon: UserX,
      color: "text-danger",
    },
    {
      label: "Late Today",
      value: todaysLogs.filter((l) => l.status === "LATE").length,
      caption: "past grace period",
      icon: CalendarClock,
      color: "text-warning",
    },
    {
      label: "On Leave Today",
      value: todaysLogs.filter((l) => l.status === "ON_LEAVE").length,
      caption: "approved leave today",
      icon: ClipboardList,
      color: "text-info",
    },
  ];

  const employeeTodayLog = (employeeId: string) => todaysLogs.find((l) => l.employeeId === employeeId);

  const filtered = logs.filter((l) => {
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return l.employeeName.toLowerCase().includes(q) || l.employeeCode.toLowerCase().includes(q);
  });

  const sorted = filtered.slice().sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "employeeName":
        return a.employeeName.localeCompare(b.employeeName) * dir;
      case "status":
        return a.status.localeCompare(b.status) * dir;
      case "workedHours":
        return ((a.workedHours ?? 0) - (b.workedHours ?? 0)) * dir;
      case "date":
      default:
        return a.date.localeCompare(b.date) * dir;
    }
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FormBreadcrumb items={[{ label: "HRMS", to: "/hrms/overview" }, { label: "Attendance Management" }]} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance Management</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSummaryVisible((v) => !v)} className={cn("gap-1.5", BUTTON_PRESS)}>
              {summaryVisible ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {summaryVisible ? "Hide Summary" : "Show Summary"}
            </Button>
            <Button onClick={() => openMark()} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-4 w-4" />
              Mark Attendance
            </Button>
          </div>
        </div>
      </div>

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
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Quick check-in / check-out</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!employeesLoading &&
              employees
                .filter((e) => e.status === "ACTIVE")
                .map((e) => {
                  const log = employeeTodayLog(e.id);
                  const checkedIn = !!log?.checkIn && !log?.checkOut;
                  return (
                    <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <span className="text-sm font-medium text-foreground">{e.fullName}</span>
                      {log && <StatusBadge status={log.status} className="text-[10px]" />}
                      {checkedIn ? (
                        <Button size="xs" variant="outline" disabled={submitting} onClick={() => handleCheckOut(e.id)} className={BUTTON_PRESS}>
                          <LogOut className="h-3.5 w-3.5" />
                          Check out
                        </Button>
                      ) : (
                        <Button size="xs" disabled={submitting || !!log?.checkOut} onClick={() => handleCheckIn(e.id)} className={BUTTON_PRESS}>
                          <LogIn className="h-3.5 w-3.5" />
                          {log?.checkOut ? "Done" : "Check in"}
                        </Button>
                      )}
                    </div>
                  );
                })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-8" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
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
                {(["shift", "notes"] as const).map((col) => (
                  <DropdownMenuItem
                    key={col}
                    onSelect={(e) => {
                      e.preventDefault();
                      setVisibleCols((v) => ({ ...v, [col]: !v[col] }));
                    }}
                  >
                    <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                    {col === "shift" ? "Shift" : "Notes"}
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
                  <SortHeader label="Employee" k="employeeName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 font-medium">Check-in</th>
                  <th className="px-4 py-2.5 font-medium">Check-out</th>
                  <SortHeader label="Worked hrs" k="workedHours" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                  {visibleCols.shift && <th className="px-4 py-2.5 font-medium">Shift</th>}
                  {visibleCols.notes && <th className="px-4 py-2.5 font-medium">Notes</th>}
                  <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {!loading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                      No attendance records found.
                    </td>
                  </tr>
                )}
                {sorted.slice(0, 100).map((l, idx) => (
                  <tr
                    key={l.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                    style={{ animationDelay: `${idx * 20}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-primary">{l.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{l.employeeCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(l.date)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtTime(l.checkIn)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtTime(l.checkOut)}</td>
                    <td className="px-4 py-2.5 text-right">{l.workedHours ?? "—"}</td>
                    {visibleCols.shift && <td className="px-4 py-2.5 text-muted-foreground">{l.shiftName ?? "—"}</td>}
                    {visibleCols.notes && <td className="px-4 py-2.5 text-muted-foreground">{l.notes ?? "—"}</td>}
                    <td className="px-4 py-2.5">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={BUTTON_PRESS}
                        onClick={() =>
                          openMark({ employeeId: l.employeeId, date: l.date.slice(0, 10), status: l.status, notes: l.notes ?? "" })
                        }
                      >
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

      <Dialog open={marking} onOpenChange={setMarking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark attendance</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarking(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleMark} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <th className={cn("px-4 py-2.5 font-medium", className)}>
      <button
        className={cn("flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground", active && "text-foreground", className?.includes("text-right") && "ml-auto")}
        onClick={() => onSort(k)}
      >
        {label}
        {active ? sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
  );
}
