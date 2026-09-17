import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { CalendarCheck2, CheckCircle2, ChevronDown, ChevronUp, Layers, Pencil, Plus, TrendingDown, Trash2 } from "lucide-react";
import {
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { Designation, EmployeeLite, LeaveType } from "./types";
import { LEAVE_ACCRUAL_OPTIONS, LEAVE_TYPE_COLORS } from "./types";

const POLICY_QUERY = gql`
  query LeavePolicyData {
    leaveTypes {
      id
      name
      code
      description
      color
      defaultDaysPerYear
      maxCarryForwardDays
      accrualType
      paid
      isLOP
      requiresApproval
      encashable
      applicableGender
      restrictedDesignations
      restrictedEmployeeIds
      minServiceDays
      minNoticeDays
      maxConsecutiveDays
      active
    }
    designations {
      id
      name
    }
  }
`;
const CREATE_LEAVE_TYPE = gql`
  mutation CreateLeaveTypePolicy($input: CreateLeaveTypeInput!) {
    createLeaveType(input: $input) {
      id
    }
  }
`;
const UPDATE_LEAVE_TYPE = gql`
  mutation UpdateLeaveTypePolicy($id: String!, $input: CreateLeaveTypeInput!) {
    updateLeaveType(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_LEAVE_TYPE = gql`
  mutation DeleteLeaveTypePolicy($id: String!) {
    deleteLeaveType(id: $id)
  }
`;

interface TypeForm {
  name: string;
  code: string;
  description: string;
  color: string;
  active: boolean;
  isLOP: boolean;
  paid: boolean;
  requiresApproval: boolean;
  defaultDaysPerYear: number;
  maxCarryForwardDays: number;
  accrualType: string;
  encashable: boolean;
  applicableGender: string;
  restrictedDesignations: string[];
  restrictedEmployeeIds: string[];
  minServiceDays: number;
  minNoticeDays: number;
  maxConsecutiveDays: number;
}

const EMPTY_FORM: TypeForm = {
  name: "",
  code: "",
  description: "",
  color: LEAVE_TYPE_COLORS[0],
  active: true,
  isLOP: false,
  paid: true,
  requiresApproval: true,
  defaultDaysPerYear: 0,
  maxCarryForwardDays: 0,
  accrualType: "ANNUAL",
  encashable: false,
  applicableGender: "ALL",
  restrictedDesignations: [],
  restrictedEmployeeIds: [],
  minServiceDays: 0,
  minNoticeDays: 0,
  maxConsecutiveDays: 0,
};

function toForm(t: LeaveType): TypeForm {
  return {
    name: t.name,
    code: t.code,
    description: t.description ?? "",
    color: t.color,
    active: t.active,
    isLOP: t.isLOP,
    paid: t.paid,
    requiresApproval: t.requiresApproval,
    defaultDaysPerYear: t.defaultDaysPerYear,
    maxCarryForwardDays: t.maxCarryForwardDays,
    accrualType: t.accrualType,
    encashable: t.encashable,
    applicableGender: t.applicableGender ?? "ALL",
    restrictedDesignations: t.restrictedDesignations,
    restrictedEmployeeIds: t.restrictedEmployeeIds,
    minServiceDays: t.minServiceDays,
    minNoticeDays: t.minNoticeDays,
    maxConsecutiveDays: t.maxConsecutiveDays,
  };
}

export default function LeavePolicyTab({ employees }: { employees: EmployeeLite[] }) {
  const { data, loading, refetch } = useQuery<{ leaveTypes: LeaveType[]; designations: Designation[] }>(POLICY_QUERY);
  const [createLeaveType] = useMutation(CREATE_LEAVE_TYPE);
  const [updateLeaveType] = useMutation(UPDATE_LEAVE_TYPE);
  const [deleteLeaveType] = useMutation(DELETE_LEAVE_TYPE);

  const leaveTypes = data?.leaveTypes ?? [];
  const designations = data?.designations ?? [];

  const [showSummary, setShowSummary] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TypeForm>(EMPTY_FORM);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEmployeeSearch("");
    setDialogOpen(true);
  }

  function openEdit(t: LeaveType) {
    setEditingId(t.id);
    setForm(toForm(t));
    setEmployeeSearch("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        color: form.color,
        active: form.active,
        isLOP: form.isLOP,
        paid: form.isLOP ? false : form.paid,
        requiresApproval: form.requiresApproval,
        defaultDaysPerYear: form.defaultDaysPerYear,
        maxCarryForwardDays: form.maxCarryForwardDays,
        accrualType: form.accrualType,
        encashable: form.encashable,
        applicableGender: form.applicableGender === "ALL" ? null : form.applicableGender,
        restrictedDesignations: form.restrictedDesignations,
        restrictedEmployeeIds: form.restrictedEmployeeIds,
        minServiceDays: form.minServiceDays,
        minNoticeDays: form.minNoticeDays,
        maxConsecutiveDays: form.maxConsecutiveDays,
      };
      if (editingId) {
        await updateLeaveType({ variables: { id: editingId, input } });
        toast.success("Leave type updated");
      } else {
        await createLeaveType({ variables: { input } });
        toast.success("Leave type created");
      }
      setDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save leave type");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteLeaveType({ variables: { id: deleteTarget.id } });
      toast.success("Leave type deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete leave type");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleDesignation(name: string) {
    setForm((f) => ({
      ...f,
      restrictedDesignations: f.restrictedDesignations.includes(name)
        ? f.restrictedDesignations.filter((d) => d !== name)
        : [...f.restrictedDesignations, name],
    }));
  }

  function toggleEmployee(id: string) {
    setForm((f) => ({
      ...f,
      restrictedEmployeeIds: f.restrictedEmployeeIds.includes(id) ? f.restrictedEmployeeIds.filter((e) => e !== id) : [...f.restrictedEmployeeIds, id],
    }));
  }

  const paidCount = leaveTypes.filter((t) => t.paid).length;
  const lopCount = leaveTypes.filter((t) => t.isLOP).length;
  const annualPool = leaveTypes.reduce((s, t) => s + t.defaultDaysPerYear, 0);

  const stats = [
    { label: "Total Rules", sub: "configured rules", value: leaveTypes.length, icon: Layers, color: "text-primary" },
    { label: "Paid Types", sub: "approved compensations", value: paidCount, icon: CheckCircle2, color: "text-success" },
    { label: "LOP Types", sub: "salary deduction triggers", value: lopCount, icon: TrendingDown, color: "text-danger" },
    { label: "Annual Days Pool", sub: "days allocated annually", value: annualPool, icon: CalendarCheck2, color: "text-info" },
  ];

  const filteredEmployees = employees.filter((e) => e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowSummary((s) => !s)} className={cn("gap-1.5", BUTTON_PRESS)}>
          {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSummary ? "Hide Summary" : "Show Summary"}
        </Button>
        <Button onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
          <Plus className="h-4 w-4" />
          New Leave Type
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

      {!loading && leaveTypes.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">No leave types configured yet.</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {leaveTypes.map((t) => {
          const eligibility =
            t.restrictedDesignations.length === 0 && t.restrictedEmployeeIds.length === 0 && !t.applicableGender
              ? "All"
              : [
                  t.applicableGender ? t.applicableGender[0] + t.applicableGender.slice(1).toLowerCase() : null,
                  t.restrictedDesignations.length ? `${t.restrictedDesignations.length} designation${t.restrictedDesignations.length === 1 ? "" : "s"}` : null,
                  t.restrictedEmployeeIds.length ? `${t.restrictedEmployeeIds.length} employee${t.restrictedEmployeeIds.length === 1 ? "" : "s"}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");
          return (
            <Card key={t.id} className={cn("overflow-hidden", CARD_HOVER)}>
              <div className="h-1.5 w-full" style={{ backgroundColor: t.color }} />
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground">{t.name}</p>
                      <Badge tone="muted">{t.code}</Badge>
                      <Badge tone={t.isLOP ? "danger" : t.paid ? "success" : "muted"}>{t.isLOP ? "LOP" : t.paid ? "PAID" : "UNPAID"}</Badge>
                      {!t.active && <Badge tone="muted">Inactive</Badge>}
                    </div>
                    {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" className={cn("h-7 w-7", BUTTON_PRESS)} onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className={cn("h-7 w-7", BUTTON_PRESS)} onClick={() => setDeleteTarget(t)}>
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Annual Days</p>
                    <p className="font-medium text-foreground">{t.defaultDaysPerYear} days</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Accrual</p>
                    <p className="font-medium text-foreground">{t.accrualType[0] + t.accrualType.slice(1).toLowerCase()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Carry Forward</p>
                    <p className="font-medium text-foreground">{t.maxCarryForwardDays > 0 ? `${t.maxCarryForwardDays} days` : "None"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Eligible Pool</p>
                    <p className="font-medium text-foreground">{eligibility}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.requiresApproval && <Badge tone="info">Approval</Badge>}
                  {t.encashable && <Badge tone="info">Encashable</Badge>}
                  {t.minNoticeDays > 0 && <Badge tone="muted">{t.minNoticeDays}d notice</Badge>}
                  {t.maxConsecutiveDays > 0 && <Badge tone="muted">Max {t.maxConsecutiveDays}d</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Leave Type" : "New Leave Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Basic Info</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input placeholder="e.g. Casual Leave" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input placeholder="CL" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <span className="text-sm text-muted-foreground">{form.active ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of this leave type…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-[60px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Colour</Label>
                <div className="flex flex-wrap gap-2">
                  {LEAVE_TYPE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={cn("h-6 w-6 rounded-full ring-offset-2 transition-shadow", form.color === c && "ring-2 ring-foreground")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Loss of Pay (LOP)</p>
                  <p className="text-xs text-muted-foreground">Leave deducted from salary. Forces unpaid + no accrual.</p>
                </div>
                <Switch checked={form.isLOP} onCheckedChange={(v) => setForm({ ...form, isLOP: v, paid: v ? false : form.paid })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Paid Leave</p>
                  <p className="text-xs text-muted-foreground">Employee receives full salary during this leave.</p>
                </div>
                <Switch checked={form.paid} disabled={form.isLOP} onCheckedChange={(v) => setForm({ ...form, paid: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Requires Approval</p>
                  <p className="text-xs text-muted-foreground">Manager must approve before leave is confirmed.</p>
                </div>
                <Switch checked={form.requiresApproval} onCheckedChange={(v) => setForm({ ...form, requiresApproval: v })} />
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Accrual &amp; Balance</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Annual Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.defaultDaysPerYear}
                    onChange={(e) => setForm({ ...form, defaultDaysPerYear: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Carry Forward</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.maxCarryForwardDays}
                    onChange={(e) => setForm({ ...form, maxCarryForwardDays: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Accrual Type</Label>
                  <Select value={form.accrualType} onValueChange={(v) => setForm({ ...form, accrualType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_ACCRUAL_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o[0] + o.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.encashable} onCheckedChange={(v) => setForm({ ...form, encashable: v })} />
                  <Label>Encashable</Label>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Eligibility</p>
              <div className="space-y-1.5">
                <Label>Applicable Gender</Label>
                <Select value={form.applicableGender} onValueChange={(v) => setForm({ ...form, applicableGender: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Employees</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Restricted to Designations</Label>
                <p className="text-xs text-muted-foreground">If none selected, it applies to all designations.</p>
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {designations.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <Checkbox checked={form.restrictedDesignations.includes(d.name)} onCheckedChange={() => toggleDesignation(d.name)} />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Restricted to Employees</Label>
                <p className="text-xs text-muted-foreground">If none selected, it applies to all employees (subject to gender/designation rules).</p>
                <Input placeholder="Search employees…" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {filteredEmployees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <Checkbox checked={form.restrictedEmployeeIds.includes(e.id)} onCheckedChange={() => toggleEmployee(e.id)} />
                      {e.fullName}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Min Service Days</Label>
                  <Input type="number" min="0" value={form.minServiceDays} onChange={(e) => setForm({ ...form, minServiceDays: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Notice Days</Label>
                  <Input type="number" min="0" value={form.minNoticeDays} onChange={(e) => setForm({ ...form, minNoticeDays: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Consecutive Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.maxConsecutiveDays}
                    onChange={(e) => setForm({ ...form, maxConsecutiveDays: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : editingId ? "Save Changes" : "Create Leave Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete leave type?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.name}</span>. Leave types with existing balances or
            requests cannot be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
