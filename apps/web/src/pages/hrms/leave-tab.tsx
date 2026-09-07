import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { CalendarDays, Check, Plus, Settings2, Wallet, X } from "lucide-react";
import {
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
  Switch,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, LeaveBalance, LeaveRequest, LeaveType } from "./types";
import { fmtDate, fmtDays } from "./hrms-helpers";

const LEAVE_QUERY = gql`
  query LeaveTabData($year: Int) {
    leaveTypes {
      id
      name
      code
      defaultDaysPerYear
      paid
      carryForward
      active
    }
    leaveRequests {
      id
      employeeId
      employeeName
      leaveTypeId
      leaveTypeName
      startDate
      endDate
      halfDay
      totalDays
      reason
      status
      approvedByName
      createdAt
    }
    leaveBalances(year: $year) {
      id
      employeeId
      employeeName
      leaveTypeId
      leaveTypeName
      year
      allocatedDays
      usedDays
      remainingDays
    }
  }
`;
const CREATE_LEAVE_TYPE = gql`
  mutation CreateLeaveTypeTab($input: CreateLeaveTypeInput!) {
    createLeaveType(input: $input) {
      id
    }
  }
`;
const CREATE_LEAVE_REQUEST = gql`
  mutation CreateLeaveRequestTab($input: CreateLeaveRequestInput!) {
    createLeaveRequest(input: $input) {
      id
    }
  }
`;
const APPROVE_LEAVE_REQUEST = gql`
  mutation ApproveLeaveRequestTab($id: String!) {
    approveLeaveRequest(id: $id) {
      id
    }
  }
`;
const REJECT_LEAVE_REQUEST = gql`
  mutation RejectLeaveRequestTab($id: String!, $reason: String!) {
    rejectLeaveRequest(id: $id, reason: $reason) {
      id
    }
  }
`;

export default function LeaveTab({ employees }: { employees: EmployeeLite[]; loading: boolean }) {
  const currentYear = new Date().getFullYear();
  const { data, loading, refetch } = useQuery<{ leaveTypes: LeaveType[]; leaveRequests: LeaveRequest[]; leaveBalances: LeaveBalance[] }>(LEAVE_QUERY, {
    variables: { year: currentYear },
  });
  const [createLeaveType] = useMutation(CREATE_LEAVE_TYPE);
  const [createLeaveRequest] = useMutation(CREATE_LEAVE_REQUEST);
  const [approveLeaveRequest] = useMutation(APPROVE_LEAVE_REQUEST);
  const [rejectLeaveRequest] = useMutation(REJECT_LEAVE_REQUEST);

  const leaveTypes = data?.leaveTypes ?? [];
  const leaveRequests = data?.leaveRequests ?? [];
  const leaveBalances = data?.leaveBalances ?? [];

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", code: "", defaultDaysPerYear: 0, paid: true, carryForward: false });
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", halfDay: false, reason: "" });
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateType() {
    if (!typeForm.name || !typeForm.code) {
      toast.error("Name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      await createLeaveType({ variables: { input: typeForm } });
      toast.success("Leave type created");
      setTypeDialogOpen(false);
      setTypeForm({ name: "", code: "", defaultDaysPerYear: 0, paid: true, carryForward: false });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create leave type");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRequest() {
    if (!requestForm.employeeId || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate) {
      toast.error("All fields except reason are required");
      return;
    }
    setSubmitting(true);
    try {
      await createLeaveRequest({ variables: { input: requestForm } });
      toast.success("Leave request submitted");
      setRequestDialogOpen(false);
      setRequestForm({ employeeId: "", leaveTypeId: "", startDate: "", endDate: "", halfDay: false, reason: "" });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit leave request");
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

  const pending = leaveRequests.filter((r) => r.status === "PENDING");
  const approvedThisMonth = leaveRequests.filter((r) => r.status === "APPROVED" && new Date(r.createdAt).getMonth() === new Date().getMonth());
  const avgRemaining = leaveBalances.length ? leaveBalances.reduce((s, b) => s + b.remainingDays, 0) / leaveBalances.length : 0;

  const stats = [
    { label: "Pending Requests", value: pending.length, icon: CalendarDays, borderClass: "border-l-warning", iconBg: "bg-warning-bg text-warning" },
    { label: "Approved This Month", value: approvedThisMonth.length, icon: Check, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
    { label: "Leave Types", value: leaveTypes.length, icon: Settings2, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Avg. Balance Remaining", value: fmtDays(Math.round(avgRemaining * 10) / 10), icon: Wallet, borderClass: "border-l-info", iconBg: "bg-info-bg text-info" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((w) => (
          <Card key={w.label} className={cn(CARD_HOVER, "border-l-4", w.borderClass)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{w.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                </div>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", w.iconBg)}>
                  <w.icon className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Leave types</p>
            <Button variant="outline" size="sm" onClick={() => setTypeDialogOpen(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-3.5 w-3.5" />
              New leave type
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {leaveTypes.map((t) => (
              <Badge key={t.id} tone={t.paid ? "info" : "muted"} className="gap-1">
                {t.name} ({t.code}) · {t.defaultDaysPerYear}d/yr {t.carryForward ? "· carry-forward" : ""}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{leaveRequests.length} leave request{leaveRequests.length === 1 ? "" : "s"}</p>
            <Button onClick={() => setRequestDialogOpen(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 font-medium">To</th>
                  <th className="px-4 py-2.5 font-medium text-right">Days</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No leave requests yet.
                    </td>
                  </tr>
                )}
                {leaveRequests.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.leaveTypeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.startDate)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.endDate)}</td>
                    <td className="px-4 py-2.5 text-right">{r.totalDays}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      {r.status === "PENDING" && (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" disabled={submitting} onClick={() => handleApprove(r.id)} className={BUTTON_PRESS}>
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button size="icon" variant="ghost" disabled={submitting} onClick={() => setRejectTarget(r)} className={BUTTON_PRESS}>
                            <X className="h-3.5 w-3.5 text-danger" />
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

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Leave balances ({currentYear})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium text-right">Allocated</th>
                  <th className="px-4 py-2.5 font-medium text-right">Used</th>
                  <th className="px-4 py-2.5 font-medium text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {leaveBalances.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">{b.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{b.leaveTypeName}</td>
                    <td className="px-4 py-2.5 text-right">{b.allocatedDays}</td>
                    <td className="px-4 py-2.5 text-right">{b.usedDays}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{b.remainingDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New leave type</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Days per year</Label>
              <Input type="number" min="0" value={typeForm.defaultDaysPerYear} onChange={(e) => setTypeForm({ ...typeForm, defaultDaysPerYear: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={typeForm.paid} onCheckedChange={(v) => setTypeForm({ ...typeForm, paid: v })} />
              <Label>Paid</Label>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={typeForm.carryForward} onCheckedChange={(v) => setTypeForm({ ...typeForm, carryForward: v })} />
              <Label>Allow carry-forward</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreateType} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New leave request</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Employee</Label>
              <Select value={requestForm.employeeId} onValueChange={(v) => setRequestForm({ ...requestForm, employeeId: v })}>
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
            <div className="col-span-2 space-y-1.5">
              <Label>Leave type</Label>
              <Select value={requestForm.leaveTypeId} onValueChange={(v) => setRequestForm({ ...requestForm, leaveTypeId: v })}>
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
              <Label>From</Label>
              <Input type="date" value={requestForm.startDate} onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={requestForm.endDate} onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Reason</Label>
              <Input value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Submitting…" : "Submit request"}
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
