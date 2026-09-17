import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { CalendarDays } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
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
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";

interface RosterEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  status: string;
  shiftId: string | null;
  shiftName: string | null;
}

interface RosterShift {
  id: string;
  name: string;
  code: string | null;
  workingDays: string[];
  active: boolean;
}

interface RosterLog {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  shiftId: string | null;
  shiftCode: string | null;
  notes: string | null;
}

const ROSTER_SHELL_QUERY = gql`
  query RosterShellData {
    employees {
      id
      employeeCode
      fullName
      department
      status
      shiftId
      shiftName
    }
    shifts {
      id
      name
      code
      workingDays
      active
    }
  }
`;

const ROSTER_ATTENDANCE_QUERY = gql`
  query RosterAttendanceRange($filter: AttendanceFilterInput) {
    attendanceLogs(filter: $filter) {
      id
      employeeId
      date
      status
      shiftId
      shiftCode
      notes
    }
  }
`;

const MARK_ATTENDANCE = gql`
  mutation MarkRosterAttendance($input: MarkAttendanceInput!) {
    markAttendance(input: $input) {
      id
    }
  }
`;

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DOW_CODE = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const STATUS_OPTIONS = ["PRESENT", "LATE", "HALF_DAY", "ON_LEAVE", "ABSENT", "HOLIDAY", "WEEK_OFF"];

const STATUS_CODE: Record<string, string> = {
  ABSENT: "AB",
  HALF_DAY: "HD",
  ON_LEAVE: "L",
  HOLIDAY: "H",
  WEEK_OFF: "W",
};

const TONE_CLASS: Record<string, string> = {
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
  primary: "bg-primary/15 text-primary",
  muted: "bg-muted text-muted-foreground/70",
  faint: "bg-muted/40 text-muted-foreground/40",
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startOfWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - offset);
  return date;
}
function daysInMonth(year: number, monthIndex0: number) {
  const count = new Date(year, monthIndex0 + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, monthIndex0, i + 1));
}

type ViewMode = "today" | "weekly" | "monthly";

interface CellInfo {
  code: string;
  tone: string;
  label: string;
  disabled?: boolean;
}

function computeCell(employee: RosterEmployee, date: Date, log: RosterLog | undefined, shiftsById: Map<string, RosterShift>): CellInfo {
  if (employee.status !== "ACTIVE") {
    return { code: "IA", tone: "muted", label: "Inactive", disabled: true };
  }
  if (log) {
    if (log.status === "PRESENT" || log.status === "LATE") {
      const code = log.shiftCode ?? (log.shiftId ? shiftsById.get(log.shiftId)?.code : null) ?? "P";
      return { code, tone: "info", label: log.status === "LATE" ? `Late (${code})` : code };
    }
    const code = STATUS_CODE[log.status] ?? log.status.slice(0, 2).toUpperCase();
    const tone = log.status === "HOLIDAY" ? "primary" : log.status === "ABSENT" || log.status === "WEEK_OFF" ? "danger" : "warning";
    return { code, tone, label: log.status.replaceAll("_", " ") };
  }
  const dow = DOW_CODE[date.getDay()];
  const defaultShift = employee.shiftId ? shiftsById.get(employee.shiftId) : undefined;
  const isWorkingDay = defaultShift ? defaultShift.workingDays.includes(dow) : dow !== "SAT" && dow !== "SUN";
  if (!isWorkingDay) {
    return { code: "W", tone: "danger", label: "Week Off" };
  }
  return { code: "—", tone: "faint", label: "Not marked" };
}

export default function RosterTab() {
  const { data, loading } = useQuery<{ employees: RosterEmployee[]; shifts: RosterShift[] }>(ROSTER_SHELL_QUERY);
  const employees = useMemo(() => data?.employees ?? [], [data]);
  const shifts = useMemo(() => data?.shifts ?? [], [data]);
  const shiftsById = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]);

  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [anchor, setAnchor] = useState(() => new Date());
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [markAttendance] = useMutation(MARK_ATTENDANCE);

  const dates = useMemo(() => {
    if (viewMode === "today") return [anchor];
    if (viewMode === "weekly") {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return daysInMonth(anchor.getFullYear(), anchor.getMonth());
  }, [viewMode, anchor]);

  const rangeFrom = toISODate(dates[0]);
  const rangeTo = toISODate(dates[dates.length - 1]);

  const { data: attendanceData, loading: attendanceLoading, refetch } = useQuery<{ attendanceLogs: RosterLog[] }>(ROSTER_ATTENDANCE_QUERY, {
    variables: { filter: { from: rangeFrom, to: rangeTo } },
  });

  const logsByKey = useMemo(() => {
    const map = new Map<string, RosterLog>();
    for (const log of attendanceData?.attendanceLogs ?? []) {
      map.set(`${log.employeeId}_${log.date.slice(0, 10)}`, log);
    }
    return map;
  }, [attendanceData]);

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(), [employees]);
  const visibleEmployees = useMemo(
    () => employees.filter((e) => departmentFilter === "ALL" || e.department === departmentFilter).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [employees, departmentFilter],
  );

  const [editing, setEditing] = useState<{ employee: RosterEmployee; date: Date } | null>(null);
  const [form, setForm] = useState({ status: "PRESENT", shiftId: "NONE", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  function openCell(employee: RosterEmployee, date: Date) {
    if (employee.status !== "ACTIVE") return;
    const key = `${employee.id}_${toISODate(date)}`;
    const log = logsByKey.get(key);
    if (log) {
      setForm({ status: log.status, shiftId: log.shiftId ?? "NONE", notes: log.notes ?? "" });
    } else {
      const cell = computeCell(employee, date, undefined, shiftsById);
      setForm({ status: cell.code === "W" ? "WEEK_OFF" : "PRESENT", shiftId: employee.shiftId ?? "NONE", notes: "" });
    }
    setEditing({ employee, date });
  }

  async function handleSave() {
    if (!editing) return;
    setSubmitting(true);
    try {
      await markAttendance({
        variables: {
          input: {
            employeeId: editing.employee.id,
            date: toISODate(editing.date),
            status: form.status,
            shiftId: form.shiftId === "NONE" ? null : form.shiftId,
            notes: form.notes || undefined,
          },
        },
      });
      toast.success("Roster updated");
      setEditing(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update roster");
    } finally {
      setSubmitting(false);
    }
  }

  const legendShiftCodes = useMemo(
    () => Array.from(new Map(shifts.filter((s) => s.active && s.code).map((s) => [s.code, s.name])).entries()),
    [shifts],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="border-none">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>

            {viewMode === "monthly" ? (
              <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Month:</span>
                <Input
                  type="month"
                  className="h-6 w-36 border-none p-0 shadow-none focus-visible:ring-0"
                  value={`${anchor.getFullYear()}-${pad2(anchor.getMonth() + 1)}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split("-").map(Number);
                    if (y && m) setAnchor(new Date(y, m - 1, 1));
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  className="h-6 w-36 border-none p-0 shadow-none focus-visible:ring-0"
                  value={toISODate(anchor)}
                  onChange={(e) => e.target.value && setAnchor(new Date(`${e.target.value}T00:00:00`))}
                />
              </div>
            )}
          </div>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legend:</span>
          {legendShiftCodes.map(([code, name]) => (
            <span key={code} title={name} className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS.info)}>
              {code} <span className="font-normal opacity-80">| {name}</span>
            </span>
          ))}
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS.warning)}>HD <span className="font-normal opacity-80">| Half day</span></span>
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS.warning)}>L <span className="font-normal opacity-80">| On leave</span></span>
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS.primary)}>H <span className="font-normal opacity-80">| Holiday</span></span>
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS.danger)}>W <span className="font-normal opacity-80">| Off</span></span>
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS.danger)}>AB <span className="font-normal opacity-80">| Absent</span></span>
          <span className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS.muted)}>IA <span className="font-normal opacity-80">| Inactive</span></span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="sticky left-0 z-10 min-w-[220px] bg-muted/30 px-4 py-2.5 font-medium">Employee Roster</th>
                  {dates.map((d) => {
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={toISODate(d)} className={cn("min-w-[56px] px-1.5 py-2 text-center font-medium", weekend && "text-danger")}>
                        <div className="text-[10px] uppercase">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                        <div className="text-sm">{d.getDate()}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {!loading && !attendanceLoading && visibleEmployees.length === 0 && (
                  <tr>
                    <td colSpan={dates.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                      No employees found.
                    </td>
                  </tr>
                )}
                {visibleEmployees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 15}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="sticky left-0 z-10 bg-card px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px]">
                            {emp.fullName
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{emp.fullName}</p>
                          <p className="text-xs text-muted-foreground"># {emp.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    {dates.map((d) => {
                      const key = `${emp.id}_${toISODate(d)}`;
                      const cell = computeCell(emp, d, logsByKey.get(key), shiftsById);
                      return (
                        <td key={key} className="px-1.5 py-1.5 text-center">
                          <button
                            type="button"
                            disabled={cell.disabled}
                            title={cell.label}
                            onClick={() => openCell(emp, d)}
                            className={cn(
                              "mx-auto flex h-8 w-11 items-center justify-center rounded-md text-[11px] font-semibold transition-transform",
                              TONE_CLASS[cell.tone],
                              !cell.disabled && "cursor-pointer hover:scale-105",
                              cell.disabled && "cursor-not-allowed",
                            )}
                          >
                            {cell.code}
                          </button>
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.employee.fullName} — {editing ? editing.date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select value={form.shiftId} onValueChange={(v) => setForm({ ...form, shiftId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No shift</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
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
            <Button variant="outline" onClick={() => setEditing(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { WEEKDAYS };
