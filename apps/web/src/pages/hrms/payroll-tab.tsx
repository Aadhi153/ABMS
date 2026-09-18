import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Plus, Users, Wallet } from "lucide-react";
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
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, PayrollRun } from "./types";
import { inr, monthLabel } from "./hrms-helpers";

const RUNS_QUERY = gql`
  query PayrollRunsTabData {
    payrollRuns {
      id
      month
      year
      status
      totalGross
      totalDeductions
      totalNet
      processedByName
      processedAt
      payslipCount
    }
  }
`;
const CREATE_RUN = gql`
  mutation CreatePayrollRunTab($input: CreatePayrollRunInput!) {
    createPayrollRun(input: $input) {
      id
    }
  }
`;

export default function PayrollTab({ loading: _shellLoading }: { employees: EmployeeLite[]; loading: boolean }) {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ payrollRuns: PayrollRun[] }>(RUNS_QUERY);
  const [createRun] = useMutation(CREATE_RUN);

  const runs = data?.payrollRuns ?? [];
  const now = new Date();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const res = await createRun({ variables: { input: form } });
      toast.success("Payroll run created");
      setCreating(false);
      await refetch();
      const newId = res.data?.createPayrollRun?.id;
      if (newId) navigate(`/hrms/payroll/${newId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create payroll run");
    } finally {
      setSubmitting(false);
    }
  }

  const thisMonthRun = runs.find((r) => r.month === now.getMonth() + 1 && r.year === now.getFullYear());
  const lastRun = runs[0];

  const stats = [
    { label: "This Month", value: thisMonthRun ? thisMonthRun.status : "Not started", icon: Wallet, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Last Run Gross", value: lastRun ? inr(lastRun.totalGross) : "—", icon: Wallet, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
    { label: "Last Run Net", value: lastRun ? inr(lastRun.totalNet) : "—", icon: Wallet, borderClass: "border-l-info", iconBg: "bg-info-bg text-info" },
    { label: "Employees Paid", value: lastRun?.payslipCount ?? 0, icon: Users, borderClass: "border-l-warning", iconBg: "bg-warning-bg text-warning" },
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
                  <p className="text-xl font-bold tracking-tight text-foreground">{w.value}</p>
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
            <p className="text-sm text-muted-foreground">{runs.length} payroll run{runs.length === 1 ? "" : "s"}</p>
            <Button onClick={() => setCreating(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-4 w-4" />
              New Payroll Run
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Gross</th>
                  <th className="px-4 py-2.5 font-medium text-right">Deductions</th>
                  <th className="px-4 py-2.5 font-medium text-right">Net</th>
                  <th className="px-4 py-2.5 font-medium">Processed by</th>
                </tr>
              </thead>
              <tbody>
                {!loading && runs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No payroll runs yet.
                    </td>
                  </tr>
                )}
                {runs.map((r, idx) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/hrms/payroll/${r.id}`)}
                    className="animate-in fade-in slide-in-from-top-1 cursor-pointer border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{monthLabel(r.month, r.year)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">{inr(r.totalGross)}</td>
                    <td className="px-4 py-2.5 text-right">{inr(r.totalDeductions)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{inr(r.totalNet)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.processedByName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New payroll run</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Input type="number" min="1" max="12" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input type="number" min="2000" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
