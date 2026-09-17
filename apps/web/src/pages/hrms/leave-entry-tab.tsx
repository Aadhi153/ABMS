import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Calendar, Check, ChevronDown, ChevronUp, ClipboardList, Plus, Settings2, X } from "lucide-react";
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
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, LeaveRequest, LeaveType } from "./types";
import { fmtDate } from "./hrms-helpers";

const ENTRY_QUERY = gql`
  query LeaveEntryData {
    leaveTypes {
      id
      name
      code
    }
    leaveRequests {
      id
      employeeId
      employeeName
      employeeCode
      department
      leaveTypeId
      leaveTypeName
      leaveTypeCode
      startDate
      endDate
      halfDay
      totalDays
      reason
      status
      approvedByName
      createdAt
    }
  }
`;
const RECORD_LEAVE_ENTRY = gql`
  mutation RecordLeaveEntryTab($input: RecordLeaveEntryInput!) {
    recordLeaveEntry(input: $input) {
      id
    }
  }
`;
const APPROVE_LEAVE_REQUEST = gql`
  mutation ApproveLeaveRequestEntryTab($id: String!) {
    approveLeaveRequest(id: $id) {
      id
    }
  }
`;
const REJECT_LEAVE_REQUEST = gql`
  mutation RejectLeaveRequestEntryTab($id: String!, $reason: String!) {
    rejectLeaveRequest(id: $id, reason: $reason) {
      id
    }
  }
`;
const CANCEL_LEAVE_REQUEST = gql`
  mutation CancelLeaveRequestEntryTab($id: String!) {
    cancelLeaveRequest(id: $id) {
      id
    }
  }
`;

function countDays(startDate: string, endDate: string, halfDay: boolean) {
  if (!startDate || !endDate) return 0;
  if (halfDay) return 0.5;
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
}

const EMPTY_ENTRY_FORM = {
  department: "ALL",
  designation: "ALL",
  employeeId: "",
  leaveTypeId: "",
  halfDay: false,
  startDate: "",
  endDate: "",
  reason: "",
};

export default function LeaveEntryTab({ employees }: { employees: EmployeeLite[] }) {
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonth);
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, refetch } = useQuery<{ leaveTypes: LeaveType[]; leaveRequests: LeaveRequest[] }>(ENTRY_QUERY);
  const [recordLeaveEntry] = useMutation(RECORD_LEAVE_ENTRY);
  const [approveLeaveRequest] = useMutation(APPROVE_LEAVE_REQUEST);
  const [rejectLeaveRequest] = useMutation(REJECT_LEAVE_REQUEST);
  const [cancelLeaveRequest] = useMutation(CANCEL_LEAVE_REQUEST);

  const leaveTypes = data?.leaveTypes ?? [];
  const leaveRequests = data?.leaveRequests ?? [];

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(), [employees]);
  const designations = useMemo(() => Array.from(new Set(employees.map((e) => e.designation).filter(Boolean))).sort(), [employees]);

  const monthRequests = useMemo(() => leaveRequests.filter((r) => r.startDate.slice(0, 7) === month), [leaveRequests, month]);

  const filteredRequests = useMemo(
    () =>
      monthRequests.filter((r) => {
        if (deptFilter !== "ALL" && r.department !== deptFilter) return false;
        if (typeFilter !== "ALL" && r.leaveTypeId !== typeFilter) return false;
        if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
        if (search && !r.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [monthRequests, deptFilter, typeFilter, statusFilter, search],
  );

  const entryEmployees = useMemo(
    () =>
      employees.filter((e) => {
        if (entryForm.department !== "ALL" && e.department !== entryForm.department) return false;
        if (entryForm.designation !== "ALL" && e.designation !== entryForm.designation) return false;
        return true;
      }),
    [employees, entryForm.department, entryForm.designation],
  );

  function openEntry() {
    setEntryForm(EMPTY_ENTRY_FORM);
    setEntryOpen(true);
  }

  async function handleRecordEntry() {
    if (!entryForm.employeeId || !entryForm.leaveTypeId || !entryForm.startDate || !entryForm.endDate) {
      toast.error("Employee, leave type and dates are required");
      return;
    }
    setSubmitting(true);
    try {
      await recordLeaveEntry({
        variables: {
          input: {
            employeeId: entryForm.employeeId,
            leaveTypeId: entryForm.leaveTypeId,
            startDate: entryForm.startDate,
            endDate: entryForm.endDate,
            halfDay: entryForm.halfDay,
            reason: entryForm.reason || undefined,
          },
        },
      });
      toast.success("Leave entry recorded");
      setEntryOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record leave entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    setSubmitting(true);
    try {
      await approveLeaveRequest({ variables: { id } });
      toast.success("Leave request approved");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      await rejectLeaveRequest({ variables: { id: rejectTarget.id, reason: rejectReason || "No reason given" } });
      toast.success("Leave request rejected");
      setRejectTarget(null);
      setRejectReason("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    setSubmitting(true);
    try {
      await cancelLeaveRequest({ variables: { id } });
      toast.success("Leave request cancelled");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setSubmitting(false);
    }
  }

  const pending = monthRequests.filter((r) => r.status === "PENDING");
  const totalDays = monthRequests.reduce((s, r) => (r.status === "CANCELLED" || r.status === "REJECTED" ? s : s + r.totalDays), 0);

  const stats = [
    { label: "Total Records", sub: `entries for ${month}`, value: monthRequests.length, icon: ClipboardList, color: "text-primary" },
    { label: "Leave Types", sub: "active rules", value: leaveTypes.length, icon: Settings2, color: "text-info" },
    { label: "Pending Requests", sub: "awaiting review", value: pending.length, icon: Calendar, color: "text-warning" },
    { label: "Total Leave Days", sub: `days taken in ${month}`, value: totalDays, icon: Calendar, color: "text-success" },
  ];

  const computedDays = countDays(entryForm.startDate, entryForm.endDate, entryForm.halfDay);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowSummary((s) => !s)} className={cn("gap-1.5", BUTTON_PRESS)}>
          {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSummary ? "Hide Summary" : "Show Summary"}
        </Button>
        <Button onClick={openEntry} className={cn("gap-1.5", BUTTON_PRESS)}>
          <Plus className="h-4 w-4" />
          New Leave Entry
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
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="flex flex-wrap items-center gap-2">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
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
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Leave Type</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 font-medium">To</th>
                  <th className="px-4 py-2.5 font-medium text-right">Days</th>
                  <th className="px-4 py-2.5 font-medium">Remarks</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                      No leave entries for this period.
                    </td>
                  </tr>
                )}
                {filteredRequests.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 20}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.employeeCode ?? "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.department ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.leaveTypeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.startDate)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.endDate)}</td>
                    <td className="px-4 py-2.5 text-right">{r.totalDays}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.reason || "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      {r.status === "PENDING" && (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" disabled={submitting} onClick={() => handleApprove(r.id)} className={cn("h-7 w-7", BUTTON_PRESS)}>
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button size="icon" variant="ghost" disabled={submitting} onClick={() => setRejectTarget(r)} className={cn("h-7 w-7", BUTTON_PRESS)}>
                            <X className="h-3.5 w-3.5 text-danger" />
                          </Button>
                          <Button variant="link" size="sm" disabled={submitting} onClick={() => handleCancel(r.id)} className={cn("h-auto p-0 text-xs", BUTTON_PRESS)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Entry</DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-muted-foreground">Record a new approved leave for an employee.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Filter by Department</Label>
              <Select value={entryForm.department} onValueChange={(v) => setEntryForm({ ...entryForm, department: v, employeeId: "" })}>
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label>Filter by Designation</Label>
              <Select value={entryForm.designation} onValueChange={(v) => setEntryForm({ ...entryForm, designation: v, employeeId: "" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Designations</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Employee *</Label>
              <Select value={entryForm.employeeId} onValueChange={(v) => setEntryForm({ ...entryForm, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Search & select employee" />
                </SelectTrigger>
                <SelectContent>
                  {entryEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leave Type *</Label>
              <Select value={entryForm.leaveTypeId} onValueChange={(v) => setEntryForm({ ...entryForm, leaveTypeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
              <Label>Duration</Label>
              <Select value={entryForm.halfDay ? "HALF" : "FULL"} onValueChange={(v) => setEntryForm({ ...entryForm, halfDay: v === "HALF" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full Day</SelectItem>
                  <SelectItem value="HALF">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>From Date *</Label>
              <Input type="date" value={entryForm.startDate} onChange={(e) => setEntryForm({ ...entryForm, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date *</Label>
              <Input type="date" value={entryForm.endDate} onChange={(e) => setEntryForm({ ...entryForm, endDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Number of Days</Label>
              <Input value={computedDays} disabled />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Remarks</Label>
              <Input placeholder="Reason / notes…" value={entryForm.reason} onChange={(e) => setEntryForm({ ...entryForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryForm(EMPTY_ENTRY_FORM)} className={BUTTON_PRESS}>
              Clear
            </Button>
            <Button onClick={handleRecordEntry} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save Leave Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject leave request?</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
