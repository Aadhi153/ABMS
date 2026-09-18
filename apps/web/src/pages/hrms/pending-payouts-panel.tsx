import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Check, Plus, X } from "lucide-react";
import {
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
  StatusBadge,
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, Incentive } from "./types";
import { inr, titleCase } from "./hrms-helpers";

const PAYOUTS_QUERY = gql`
  query PendingPayoutsPanelData {
    incentives {
      id
      employeeId
      employeeName
      source
      appraisalPeriod
      finalScore
      amount
      reason
      status
    }
  }
`;
const APPROVE_INCENTIVE = gql`
  mutation ApprovePayoutPanel($id: String!) {
    approveIncentive(id: $id) {
      id
    }
  }
`;
const REJECT_INCENTIVE = gql`
  mutation RejectPayoutPanel($id: String!) {
    rejectIncentive(id: $id) {
      id
    }
  }
`;
const CREATE_MANUAL_INCENTIVE = gql`
  mutation CreateManualIncentivePanel($input: CreateManualIncentiveInput!) {
    createManualIncentive(input: $input) {
      id
    }
  }
`;

const EMPTY_FORM = { amount: "", giveFullAmountToEach: false, reason: "" };

export default function PendingPayoutsPanel({ employees }: { employees: EmployeeLite[] }) {
  const { data, loading, refetch } = useQuery<{ incentives: Incentive[] }>(PAYOUTS_QUERY);
  const [approveIncentive] = useMutation(APPROVE_INCENTIVE);
  const [rejectIncentive] = useMutation(REJECT_INCENTIVE);
  const [createManualIncentive] = useMutation(CREATE_MANUAL_INCENTIVE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const incentives = data?.incentives ?? [];
  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesDept = departmentFilter.length === 0 || departmentFilter.includes(e.department);
      const matchesSearch =
        !employeeSearch.trim() ||
        e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(employeeSearch.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [employees, departmentFilter, employeeSearch]);

  function toggleDepartment(dept: string) {
    setDepartmentFilter((prev) => (prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]));
  }
  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  function resetDialog() {
    setDepartmentFilter([]);
    setEmployeeSearch("");
    setSelectedEmployeeIds([]);
    setForm(EMPTY_FORM);
  }

  async function handleCreate() {
    if (selectedEmployeeIds.length === 0) {
      toast.error("Select at least one employee");
      return;
    }
    if (!form.amount || !form.reason.trim()) {
      toast.error("Bonus amount and reason are required");
      return;
    }
    setSubmitting(true);
    try {
      await createManualIncentive({
        variables: {
          input: {
            employeeIds: selectedEmployeeIds,
            amount: Number(form.amount),
            giveFullAmountToEach: form.giveFullAmountToEach,
            reason: form.reason.trim(),
          },
        },
      });
      toast.success("Manual incentive created");
      setDialogOpen(false);
      resetDialog();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create incentive");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveIncentive({ variables: { id } });
      toast.success("Incentive approved");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  }
  async function handleReject(id: string) {
    try {
      await rejectIncentive({ variables: { id } });
      toast.success("Incentive rejected");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Pending Payout Approvals</p>
            <p className="text-xs text-muted-foreground">Review and approve incentive bonuses generated from completed appraisals before injection to payroll.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className={cn("shrink-0 gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" />
            Manual Incentive
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Appraisal period</th>
                <th className="px-4 py-2.5 font-medium">Final score</th>
                <th className="px-4 py-2.5 font-medium text-right">Bonus amount (₹)</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && incentives.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No incentive payouts yet.
                  </td>
                </tr>
              )}
              {incentives.map((i, idx) => (
                <tr
                  key={i.id}
                  className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                  style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">{i.employeeName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{i.appraisalPeriod ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{i.finalScore != null ? `${i.finalScore} / 5` : "Manual"}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{inr(i.amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">{titleCase(i.source)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    {i.status === "PENDING" && (
                      <div className="flex items-center gap-1">
                        <Button size="xs" onClick={() => handleApprove(i.id)} className={BUTTON_PRESS}>
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button size="xs" variant="destructive" onClick={() => handleReject(i.id)} className={BUTTON_PRESS}>
                          <X className="h-3.5 w-3.5" />
                          Reject
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Employee Incentive</DialogTitle>
            <p className="text-sm text-muted-foreground">Directly assign a manual incentive bonus to an employee. This will create a pending approval request.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Filter by Department</Label>
              <div className="max-h-24 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {departments.map((d) => (
                  <label key={d} className="flex items-center gap-2 py-0.5 text-sm">
                    <Checkbox checked={departmentFilter.includes(d)} onCheckedChange={() => toggleDepartment(d)} />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                Select Employees <span className="text-danger">*</span>
              </Label>
              <Input placeholder="Type to search employees by name or code…" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} />
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {filteredEmployees.length === 0 && <p className="px-1 py-2 text-xs text-muted-foreground">No employees match.</p>}
                {filteredEmployees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 py-0.5 text-sm">
                    <Checkbox checked={selectedEmployeeIds.includes(e.id)} onCheckedChange={() => toggleEmployee(e.id)} />
                    {e.fullName}
                    <span className="text-xs text-muted-foreground">{e.employeeCode}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Bonus Amount (₹) *</Label>
              <Input type="number" min="1" placeholder="e.g. 5000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={form.giveFullAmountToEach}
                onCheckedChange={(v) => setForm({ ...form, giveFullAmountToEach: v === true })}
                className="mt-0.5"
              />
              Give this amount to EACH selected employee (otherwise, amount is split equally)
            </label>
            <div className="space-y-1.5">
              <Label>Reason / Remarks *</Label>
              <Textarea placeholder="Enter the reason for issuing this manual incentive" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Creating…" : "Create Incentive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
