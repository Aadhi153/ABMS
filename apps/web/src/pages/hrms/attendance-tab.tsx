import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Calendar,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  ScanFace,
  Signal,
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
import type { AttendanceLog, Branch, BiometricTerminal, EmployeeLite } from "./types";
import { fmtDate, fmtDateLong } from "./hrms-helpers";
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
      checkInTerminalName
      checkInVerifyMethod
      checkOutTerminalName
      checkOutVerifyMethod
      sessions {
        id
        sessionIndex
        checkIn
        checkOut
        terminalName
        verifyMethod
      }
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
const TERMINALS_QUERY = gql`
  query AttendanceTerminalsTab {
    biometricTerminals {
      id
      name
      code
      branchId
      capabilities
      status
      lastSeenAt
      active
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
const ADD_SESSION = gql`
  mutation AddAttendanceSessionTab($input: AddAttendanceSessionInput!) {
    addAttendanceSession(input: $input) {
      id
    }
  }
`;
const SYNC_BIOMETRIC_LOGS = gql`
  mutation SyncBiometricLogsRegisterTab($input: SyncBiometricLogsInput!) {
    syncBiometricLogs(input: $input) {
      success
      syncedCount
      message
    }
  }
`;

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "HALF_DAY", "LATE", "PAID_LEAVE", "LOP", "HOLIDAY", "WEEK_OFF", "ON_TOUR"];
const STATUS_CHIPS = [
  { code: "PR", status: "PRESENT" },
  { code: "LC", status: "LATE" },
  { code: "AB", status: "ABSENT" },
  { code: "LOP", status: "LOP" },
  { code: "HD", status: "HALF_DAY" },
  { code: "PL", status: "PAID_LEAVE" },
  { code: "W", status: "WEEK_OFF" },
  { code: "H", status: "HOLIDAY" },
  { code: "OT", status: "ON_TOUR" },
];
const VERIFY_METHOD_LABEL: Record<string, string> = { FACE_ID: "FaceID", FINGERPRINT: "Fingerprint", MANUAL: "Manual" };
const TONE_CARD_CLASSES: Record<string, { dot: string; chip: string; text: string; gradient: string; ring: string; glow: string }> = {
  success: {
    dot: "bg-success",
    chip: "bg-success/15",
    text: "text-success",
    gradient: "from-success/15 via-success/5 to-transparent",
    ring: "hover:border-success/40",
    glow: "bg-success",
  },
  warning: {
    dot: "bg-warning",
    chip: "bg-warning/15",
    text: "text-warning",
    gradient: "from-warning/15 via-warning/5 to-transparent",
    ring: "hover:border-warning/40",
    glow: "bg-warning",
  },
  danger: {
    dot: "bg-danger",
    chip: "bg-danger/15",
    text: "text-danger",
    gradient: "from-danger/15 via-danger/5 to-transparent",
    ring: "hover:border-danger/40",
    glow: "bg-danger",
  },
  info: {
    dot: "bg-info",
    chip: "bg-info/15",
    text: "text-info",
    gradient: "from-info/15 via-info/5 to-transparent",
    ring: "hover:border-info/40",
    glow: "bg-info",
  },
  muted: {
    dot: "bg-muted-foreground",
    chip: "bg-muted",
    text: "text-muted-foreground",
    gradient: "from-muted/80 via-muted/30 to-transparent",
    ring: "hover:border-muted-foreground/30",
    glow: "bg-muted-foreground",
  },
};
type SubTab = "register" | "biometric";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "register", label: "Daily Register" },
  { key: "biometric", label: "Biometric Sync" },
];

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function firstOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
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

function relativeTime(iso: string | null) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

interface RowEdit {
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string;
}

interface SessionForm {
  checkIn: string;
  checkOut: string;
  terminalId: string;
  verifyMethod: string;
}

const EMPTY_SESSION_FORM: SessionForm = { checkIn: "", checkOut: "", terminalId: "", verifyMethod: "" };

export default function AttendanceTab({ employees, loading: employeesLoading }: { employees: EmployeeLite[]; loading: boolean }) {
  const [subTab, setSubTab] = useState<SubTab>("register");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [showAllDates, setShowAllDates] = useState(false);

  const dateStr = toDateInputValue(selectedDate);
  const isToday = dateStr === toDateInputValue(new Date());
  const rangeFrom = showAllDates ? toDateInputValue(firstOfMonth(selectedDate)) : dateStr;
  const rangeTo = showAllDates ? toDateInputValue(lastOfMonth(selectedDate)) : dateStr;

  const { data, loading, refetch } = useQuery<{ attendanceLogs: AttendanceLog[]; branches: Branch[] }>(REGISTER_QUERY, {
    variables: { filter: { from: rangeFrom, to: rangeTo } },
    fetchPolicy: "cache-and-network",
  });
  const { data: terminalsData, refetch: refetchTerminals } = useQuery<{ biometricTerminals: BiometricTerminal[] }>(TERMINALS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const [checkIn] = useMutation(CHECK_IN);
  const [checkOut] = useMutation(CHECK_OUT);
  const [markAttendance] = useMutation(MARK_ATTENDANCE);
  const [bulkMarkAttendance] = useMutation(BULK_MARK_ATTENDANCE);
  const [addSession] = useMutation(ADD_SESSION);
  const [syncBiometricLogs] = useMutation(SYNC_BIOMETRIC_LOGS);

  const logs = data?.attendanceLogs ?? [];
  const branches = data?.branches ?? [];
  const terminals = terminalsData?.biometricTerminals ?? [];
  const todayStr = toDateInputValue(new Date());
  const todaysLogs = logs.filter((l) => l.date.slice(0, 10) === todayStr);

  const [submitting, setSubmitting] = useState(false);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [marking, setMarking] = useState(false);
  const [form, setForm] = useState({ employeeId: "", date: todayStr, status: "PRESENT", notes: "" });
  const [addSessionFor, setAddSessionFor] = useState<AttendanceLog | null>(null);
  const [sessionForm, setSessionForm] = useState<SessionForm>(EMPTY_SESSION_FORM);
  const [syncing, setSyncing] = useState(false);

  function openMark() {
    setForm({ employeeId: "", date: dateStr, status: "PRESENT", notes: "" });
    setMarking(true);
  }

  function openAddSession(log: AttendanceLog) {
    setSessionForm(EMPTY_SESSION_FORM);
    setAddSessionFor(log);
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

  async function handleAddSession() {
    if (!addSessionFor) return;
    setSubmitting(true);
    try {
      const logDateStr = addSessionFor.date.slice(0, 10);
      await addSession({
        variables: {
          input: {
            attendanceLogId: addSessionFor.id,
            checkIn: sessionForm.checkIn ? `${logDateStr}T${sessionForm.checkIn}:00` : undefined,
            checkOut: sessionForm.checkOut ? `${logDateStr}T${sessionForm.checkOut}:00` : undefined,
            terminalId: sessionForm.terminalId || undefined,
            verifyMethod: sessionForm.verifyMethod || undefined,
          },
        },
      });
      toast.success("Session added");
      setAddSessionFor(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add session");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSyncBiometricLogs() {
    const targetBranchId = branchFilter !== "ALL" ? branchFilter : branches[0]?.id;
    if (!targetBranchId) {
      toast.error("No branch available to sync");
      return;
    }
    setSyncing(true);
    try {
      const { data: res } = await syncBiometricLogs({ variables: { input: { branchId: targetBranchId, from: dateStr, to: dateStr } } });
      toast.success(res?.syncBiometricLogs?.message ?? "Sync attempted");
      await Promise.all([refetch(), refetchTerminals()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync biometric logs");
    } finally {
      setSyncing(false);
    }
  }

  const totalEmployees = employees.length;
  const leaveTodayCount = todaysLogs.filter((l) => l.status === "PAID_LEAVE" || l.status === "LOP").length;
  const stats = [
    { label: "Present", value: todaysLogs.filter((l) => l.status === "PRESENT").length, icon: CheckCircle2, tone: "success" },
    { label: "Late Come", value: todaysLogs.filter((l) => l.status === "LATE").length, icon: CalendarClock, tone: "warning" },
    { label: "Absent", value: todaysLogs.filter((l) => l.status === "ABSENT").length, icon: UserX, tone: "danger" },
    { label: "Half Day", value: todaysLogs.filter((l) => l.status === "HALF_DAY").length, icon: CalendarClock, tone: "warning" },
    { label: "Leave", value: leaveTodayCount, icon: CalendarClock, tone: "info" },
    { label: "Week Off", value: todaysLogs.filter((l) => l.status === "WEEK_OFF").length, icon: Calendar, tone: "muted" },
    { label: "Holiday", value: todaysLogs.filter((l) => l.status === "HOLIDAY").length, icon: Calendar, tone: "info" },
    { label: "On Tour", value: todaysLogs.filter((l) => l.status === "ON_TOUR").length, icon: Users, tone: "info" },
  ];

  const employeeTodayLog = (employeeId: string) => todaysLogs.find((l) => l.employeeId === employeeId);

  const onlineTerminals = terminals.filter((t) => t.active && t.status === "ONLINE");
  const capabilitiesLabel = Array.from(new Set(terminals.flatMap((t) => t.capabilities)))
    .map((c) => VERIFY_METHOD_LABEL[c] ?? c)
    .join(" & ");
  const lastSynced = terminals
    .map((t) => t.lastSeenAt)
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);

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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance Management</h1>
            <p className="text-sm text-muted-foreground">Manage daily shifts, sessions, punching telemetry, and live status registers.</p>
          </div>
          {subTab === "register" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className={cn("gap-1.5", BUTTON_PRESS)} onClick={() => setSummaryOpen((v) => !v)}>
                {summaryOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {summaryOpen ? "Hide Summary" : "Show Summary"}
              </Button>
              <Button
                variant={showAllDates ? "default" : "outline"}
                size="sm"
                className={cn("gap-1.5", BUTTON_PRESS)}
                onClick={() => setShowAllDates((v) => !v)}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                {showAllDates ? "This Date Only" : "Show All Dates"}
              </Button>
              <Button onClick={openMark} className={cn("gap-1.5", BUTTON_PRESS)}>
                <Plus className="h-4 w-4" />
                Mark Attendance
              </Button>
            </div>
          )}
        </div>
      </div>

      {subTab === "biometric" && <BiometricSyncTab branches={branches} />}

      {subTab === "register" && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-2.5 text-sm">
            <Badge tone={onlineTerminals.length > 0 ? "success" : "muted"} className="gap-1.5">
              <Signal className="h-3 w-3" />
              Biometric Sync: {onlineTerminals.length > 0 ? "Live" : "Offline"}
              {lastSynced ? ` (Synced ${relativeTime(lastSynced)})` : ""}
            </Badge>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Fingerprint className="h-3.5 w-3.5" />
              {onlineTerminals.length}/{terminals.length} Terminals Online
              {capabilitiesLabel ? ` • ${capabilitiesLabel}` : ""}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={syncing} className={cn("gap-1.5", BUTTON_PRESS)} onClick={handleSyncBiometricLogs}>
                <Download className="h-3.5 w-3.5" />
                {syncing ? "Syncing…" : "Sync Biometric Logs"}
              </Button>
              <Button size="sm" onClick={handleSaveChanges} disabled={submitting || dirtyCount === 0} className={cn("gap-1.5", BUTTON_PRESS)}>
                <Save className="h-3.5 w-3.5" />
                Save Changes{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
              </Button>
            </div>
          </div>

          {summaryOpen && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
              {stats.map((w, idx) => {
                const tone = TONE_CARD_CLASSES[w.tone];
                return (
                  <Card
                    key={w.label}
                    className={cn(
                      "group relative overflow-hidden border-border/60 bg-gradient-to-br duration-300 ease-out",
                      "animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none",
                      "hover:-translate-y-1 hover:scale-[1.03] hover:shadow-lg",
                      tone.gradient,
                      tone.ring,
                    )}
                    style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "backwards" }}
                  >
                    <span
                      className={cn(
                        "pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40",
                        tone.glow,
                      )}
                    />
                    <CardContent className="relative p-2.5">
                      <div className="flex items-center justify-between">
                        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md transition-transform duration-300 group-hover:scale-110", tone.chip)}>
                          <w.icon className={cn("h-3.5 w-3.5", tone.text)} />
                        </span>
                        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", tone.dot)} />
                      </div>
                      <p className="mt-1.5 text-lg font-bold leading-none tracking-tight text-foreground transition-transform duration-300 group-hover:scale-110">
                        {w.value}
                      </p>
                      <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{w.label}</p>
                      <p className="text-[10px] text-muted-foreground/70">of {totalEmployees}</p>
                    </CardContent>
                  </Card>
                );
              })}
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
                  {isToday ? (
                    <Badge tone="info">Today</Badge>
                  ) : (
                    <Badge tone="info" className={cn("cursor-pointer", BUTTON_PRESS)} onClick={() => setSelectedDate(new Date())}>
                      Jump to Today
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
                      {showAllDates && <th className="px-4 py-2.5 font-medium">Date</th>}
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
                        <td colSpan={showAllDates ? 10 : 9} className="px-4 py-10 text-center text-muted-foreground">
                          No attendance records for this date.
                        </td>
                      </tr>
                    )}
                    {filteredLogs.map((l, idx) => {
                      const edit = rowEdit(l);
                      const hrs = l.workedHours ?? computeHrs(edit.checkIn, edit.checkOut);
                      const verifiedNote = l.checkInTerminalName
                        ? `${l.checkInTerminalName} (${VERIFY_METHOD_LABEL[l.checkInVerifyMethod ?? ""] ?? l.checkInVerifyMethod ?? "verified"})`
                        : l.checkOutTerminalName
                          ? `${l.checkOutTerminalName} (${VERIFY_METHOD_LABEL[l.checkOutVerifyMethod ?? ""] ?? l.checkOutVerifyMethod ?? "verified"})`
                          : null;
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
                          {showAllDates && <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(l.date)}</td>}
                          <td className="px-4 py-2.5">
                            <Input
                              type="time"
                              value={edit.checkIn}
                              onChange={(e) => updateEdit(l.employeeId, l, { checkIn: e.target.value })}
                              className="w-28"
                            />
                            {verifiedNote && (
                              <p className="mt-1 flex items-center gap-1 text-[11px] text-success">
                                <ScanFace className="h-3 w-3" />
                                {verifiedNote} verified
                              </p>
                            )}
                            {l.sessions.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {l.sessions.map((s) => (
                                  <p key={s.id} className="text-[11px] text-muted-foreground">
                                    Session {s.sessionIndex}: {timeInputValue(s.checkIn) || "--:--"}–{timeInputValue(s.checkOut) || "--:--"}
                                  </p>
                                ))}
                              </div>
                            )}
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
                              title="Add punch session"
                              className="h-7 w-7 shrink-0"
                              onClick={() => openAddSession(l)}
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

      <Dialog open={!!addSessionFor} onOpenChange={(open) => !open && setAddSessionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add punch session{addSessionFor ? ` — ${addSessionFor.employeeName}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check in</Label>
              <Input type="time" value={sessionForm.checkIn} onChange={(e) => setSessionForm((f) => ({ ...f, checkIn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Check out</Label>
              <Input type="time" value={sessionForm.checkOut} onChange={(e) => setSessionForm((f) => ({ ...f, checkOut: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Terminal</Label>
              <Select value={sessionForm.terminalId} onValueChange={(v) => setSessionForm((f) => ({ ...f, terminalId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Manual entry" />
                </SelectTrigger>
                <SelectContent>
                  {terminals.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Verify method</Label>
              <Select value={sessionForm.verifyMethod} onValueChange={(v) => setSessionForm((f) => ({ ...f, verifyMethod: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VERIFY_METHOD_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSessionFor(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleAddSession} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Add session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
