import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  UserX,
  Users,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
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
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { STATUS_TONE } from "@abms/shared";
import { FormBreadcrumb } from "../products/form-page";
import { BUTTON_PRESS, CARD_HOVER } from "../products/form-motion";
import type { AttendanceLog, Branch, EmployeeLite } from "./types";
import { fmtDateLong } from "./hrms-helpers";
import BiometricSyncTab from "./biometric-sync-tab";

const REGISTER_QUERY = gql`
  query AttendanceRegisterData($filter: AttendanceFilterInput) {
    attendanceLogs(filter: $filter) {
      id
      employeeId
      employeeName
      employeeCode
      department
      designation
      branchId
      branchName
      date
      checkIn
      checkOut
      status
      workedHours
      shiftId
      shiftName
      shiftCode
      notes
    }
    branches {
      id
      name
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
const BULK_MARK_ATTENDANCE = gql`
  mutation BulkMarkAttendanceTab($input: BulkMarkAttendanceInput!) {
    bulkMarkAttendance(input: $input) {
      id
    }
  }
`;

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "HOLIDAY", "WEEK_OFF", "ON_TOUR"];
const STATUS_CHIPS = [
  { code: "PR", status: "PRESENT" },
  { code: "LC", status: "LATE" },
  { code: "AB", status: "ABSENT" },
  { code: "HD", status: "HALF_DAY" },
  { code: "AL", status: "ON_LEAVE" },
  { code: "WO", status: "WEEK_OFF" },
  { code: "PH", status: "HOLIDAY" },
  { code: "OT", status: "ON_TOUR" },
];
type SubTab = "register" | "biometric";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "register", label: "Daily Register" },
  { key: "biometric", label: "Biometric Sync" },
];

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function computeHrs(inTime: string, outTime: string) {
  if (!inTime || !outTime) return null;
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  const hrs = (oh * 60 + om - (ih * 60 + im)) / 60;
  return hrs > 0 ? Math.round(hrs * 100) / 100 : null;
}

interface RowEdit {
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string;
}

export default function AttendanceTab({ employees, loading: employeesLoading }: { employees: EmployeeLite[]; loading: boolean }) {
  const [subTab, setSubTab] = useState<SubTab>("register");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter] = useState("ALL");

  const dateStr = toDateInputValue(selectedDate);
  const isToday = dateStr === toDateInputValue(new Date());

  const { data, loading, refetch } = useQuery<{ attendanceLogs: AttendanceLog[]; branches: Branch[] }>(REGISTER_QUERY, {
    variables: { filter: { from: dateStr, to: dateStr } },
    fetchPolicy: "cache-and-network",
  });
  const [checkIn] = useMutation(CHECK_IN);
  const [checkOut] = useMutation(CHECK_OUT);
  const [markAttendance] = useMutation(MARK_ATTENDANCE);
  const [bulkMarkAttendance] = useMutation(BULK_MARK_ATTENDANCE);

  const logs = data?.attendanceLogs ?? [];
  const branches = data?.branches ?? [];
  const todayStr = toDateInputValue(new Date());
  const todaysLogs = logs.filter((l) => l.date.slice(0, 10) === todayStr);

  const [submitting, setSubmitting] = useState(false);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [marking, setMarking] = useState(false);
  const [form, setForm] = useState({ employeeId: "", date: todayStr, status: "PRESENT", notes: "" });

  function openMark() {
    setForm({ employeeId: "", date: dateStr, status: "PRESENT", notes: "" });
    setMarking(true);
  }

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(), [employees]);
  const shifts = useMemo(() => Array.from(new Set(logs.map((l) => l.shiftName).filter((s): s is string => !!s))).sort(), [logs]);

  const filteredLogs = logs.filter((l) => {
    if (branchFilter !== "ALL" && l.branchId !== branchFilter) return false;
    if (deptFilter !== "ALL" && l.department !== deptFilter) return false;
    if (shiftFilter !== "ALL" && l.shiftName !== shiftFilter) return false;
    return true;
  });

  function rowEdit(log: AttendanceLog): RowEdit {
    return (
      edits[log.employeeId] ?? {
        checkIn: timeInputValue(log.checkIn),
        checkOut: timeInputValue(log.checkOut),
        status: log.status,
        notes: log.notes ?? "",
      }
    );
  }

  function updateEdit(employeeId: string, log: AttendanceLog, patch: Partial<RowEdit>) {
    setEdits((prev) => ({ ...prev, [employeeId]: { ...rowEdit(log), ...prev[employeeId], ...patch } }));
  }

  const dirtyCount = Object.keys(edits).length;

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

  async function handleSaveChanges() {
    if (dirtyCount === 0) return;
    setSubmitting(true);
    try {
      const entries = Object.entries(edits).map(([employeeId, edit]) => ({
        employeeId,
        status: edit.status,
        checkIn: edit.checkIn ? `${dateStr}T${edit.checkIn}:00` : undefined,
        checkOut: edit.checkOut ? `${dateStr}T${edit.checkOut}:00` : undefined,
        notes: edit.notes || undefined,
      }));
      await bulkMarkAttendance({ variables: { input: { date: dateStr, entries } } });
      toast.success(`Saved ${entries.length} attendance record${entries.length === 1 ? "" : "s"}`);
      setEdits({});
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = [
    { label: "Present Today", value: todaysLogs.filter((l) => l.status === "PRESENT" || l.status === "LATE").length, icon: CheckCircle2, color: "text-success" },
    { label: "Absent Today", value: todaysLogs.filter((l) => l.status === "ABSENT").length, icon: UserX, color: "text-danger" },
    { label: "Late Today", value: todaysLogs.filter((l) => l.status === "LATE").length, icon: CalendarClock, color: "text-warning" },
    { label: "On Leave Today", value: todaysLogs.filter((l) => l.status === "ON_LEAVE").length, icon: ClipboardList, color: "text-info" },
  ];

  const employeeTodayLog = (employeeId: string) => todaysLogs.find((l) => l.employeeId === employeeId);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormBreadcrumb items={[{ label: "HR & Payroll", to: "/hrms/overview" }, { label: "Attendance Management" }]} />
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance Management</h1>
          {subTab === "register" && (
            <Button onClick={openMark} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-4 w-4" />
              Mark Attendance
            </Button>
          )}
        </div>
      </div>

      {subTab === "biometric" && <BiometricSyncTab branches={branches} />}

      {subTab === "register" && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((w, idx) => (
              <Card
                key={w.label}
                className={cn("animate-in fade-in slide-in-from-top-1 border-border duration-150 ease-out", CARD_HOVER)}
                style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{w.label}</p>
                    <w.icon className={cn("h-4 w-4 shrink-0", w.color)} />
                  </div>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

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
                        <div key={e.id} className={cn("flex items-center gap-2 rounded-lg border border-border px-3 py-2", CARD_HOVER)}>
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
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Branch</Label>
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Dept</Label>
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Shift</Label>
                    <Select value={shiftFilter} onValueChange={setShiftFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        {shifts.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setSelectedDate((d) => new Date(d.getTime() - 86_400_000))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-foreground">{fmtDateLong(selectedDate)}</span>
                  {!isToday && (
                    <Badge tone="info" className={cn("cursor-pointer", BUTTON_PRESS)} onClick={() => setSelectedDate(new Date())}>
                      Today
                    </Badge>
                  )}
                  <div className="relative">
                    <Button variant="ghost" size="icon" className={BUTTON_PRESS} tabIndex={-1}>
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <input
                      type="date"
                      value={dateStr}
                      onChange={(e) => e.target.value && setSelectedDate(new Date(`${e.target.value}T00:00:00`))}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                  <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setSelectedDate((d) => new Date(d.getTime() + 86_400_000))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className={BUTTON_PRESS} onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={submitting || dirtyCount === 0} className={cn("gap-1.5", BUTTON_PRESS)}>
                    <Save className="h-4 w-4" />
                    Save Changes{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info" className="gap-1">
                  <Users className="h-3 w-3" />
                  Employees: {filteredLogs.length}
                </Badge>
                {STATUS_CHIPS.map((c) => (
                  <Badge key={c.code} tone={STATUS_TONE[c.status] ?? "muted"}>
                    {c.code}: {filteredLogs.filter((l) => l.status === c.status).length}
                  </Badge>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="w-10 px-4 py-2.5 font-medium">#</th>
                      <th className="px-4 py-2.5 font-medium">Employee</th>
                      <th className="px-4 py-2.5 font-medium">Dept / Designation</th>
                      <th className="px-4 py-2.5 font-medium" colSpan={3}>
                        Session 1
                      </th>
                      <th className="px-4 py-2.5 font-medium">Hrs</th>
                      <th className="px-4 py-2.5 font-medium">Shift</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                          No attendance records for this date.
                        </td>
                      </tr>
                    )}
                    {filteredLogs.map((l, idx) => {
                      const edit = rowEdit(l);
                      const hrs = computeHrs(edit.checkIn, edit.checkOut);
                      return (
                        <tr
                          key={l.id}
                          className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                          style={{ animationDelay: `${idx * 20}ms`, animationFillMode: "backwards" }}
                        >
                          <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(l.employeeName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{l.employeeName}</p>
                                <p className="text-xs text-muted-foreground">{l.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="text-foreground">{l.department || "—"}</p>
                            <p className="text-xs text-muted-foreground">{l.designation || "—"}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <Input
                              type="time"
                              value={edit.checkIn}
                              onChange={(e) => updateEdit(l.employeeId, l, { checkIn: e.target.value })}
                              className="w-28"
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <Input
                              type="time"
                              value={edit.checkOut}
                              onChange={(e) => updateEdit(l.employeeId, l, { checkOut: e.target.value })}
                              className="w-28"
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              title="Multiple sessions per day aren't supported yet"
                              className="h-7 w-7 shrink-0 opacity-40"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">{hrs ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <Badge tone="muted">{l.shiftCode ?? l.shiftName ?? "—"}</Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <Select value={edit.status} onValueChange={(v) => updateEdit(l.employeeId, l, { status: v })}>
                              <SelectTrigger className="h-8 w-32 border-0 bg-transparent p-0 shadow-none">
                                <StatusBadge status={edit.status} />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s.replaceAll("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2.5">
                            <Input
                              placeholder="Add memo…"
                              value={edit.notes}
                              onChange={(e) => updateEdit(l.employeeId, l, { notes: e.target.value })}
                              className="w-36"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

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
