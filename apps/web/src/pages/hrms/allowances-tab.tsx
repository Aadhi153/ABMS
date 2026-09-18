import { useMemo, useState } from "react";
import { gql, useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { Banknote, CalendarDays, MinusCircle, Pencil, PlusCircle, Search, Settings2, Trash2, Users, Wallet } from "lucide-react";
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
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { AllowanceDeductionEntry, AllowanceDeductionSummary, EmployeeLite, EmployeeSalaryComponent, SalaryComponent } from "./types";
import { inr, monthLabel, titleCase } from "./hrms-helpers";

const ENTRIES_QUERY = gql`
  query AllowanceDeductionEntries($filter: AllowanceDeductionFilterInput) {
    allowanceDeductionEntries(filter: $filter) {
      id
      employeeId
      employeeName
      employeeCode
      department
      type
      date
      amount
      paymentMode
      remarks
    }
  }
`;
const SUMMARY_QUERY = gql`
  query AllowanceDeductionSummaryData($month: Int!, $year: Int!) {
    allowanceDeductionSummary(month: $month, year: $year) {
      totalAllowances
      totalDeductions
      netAdjustment
      totalRecords
    }
  }
`;
const CREATE_ENTRY = gql`
  mutation CreateAllowanceDeductionEntry($input: CreateAllowanceDeductionInput!) {
    createAllowanceDeductionEntry(input: $input) {
      id
    }
  }
`;
const UPDATE_ENTRY = gql`
  mutation UpdateAllowanceDeductionEntry($id: String!, $input: CreateAllowanceDeductionInput!) {
    updateAllowanceDeductionEntry(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_ENTRY = gql`
  mutation DeleteAllowanceDeductionEntry($id: String!) {
    deleteAllowanceDeductionEntry(id: $id)
  }
`;

const EMPTY_ENTRY_FORM = {
  type: "ALLOWANCE" as "ALLOWANCE" | "DEDUCTION",
  employeeId: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  paymentMode: "BANK" as "BANK" | "CASH",
  remarks: "",
};

function EntriesPanel({ employees }: { employees: EmployeeLite[] }) {
  const now = new Date();
  const [monthValue, setMonthValue] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [year, month] = monthValue.split("-").map(Number);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [summaryVisible, setSummaryVisible] = useState(true);

  const { data, loading, refetch } = useQuery<{ allowanceDeductionEntries: AllowanceDeductionEntry[] }>(ENTRIES_QUERY, {
    variables: { filter: { month, year } },
  });
  const { data: summaryData, refetch: refetchSummary } = useQuery<{ allowanceDeductionSummary: AllowanceDeductionSummary }>(SUMMARY_QUERY, {
    variables: { month, year },
  });
  const [createEntry] = useMutation(CREATE_ENTRY);
  const [updateEntry] = useMutation(UPDATE_ENTRY);
  const [deleteEntry] = useMutation(DELETE_ENTRY);

  const entries = data?.allowanceDeductionEntries ?? [];
  const summary = summaryData?.allowanceDeductionSummary ?? { totalAllowances: 0, totalDeductions: 0, netAdjustment: 0, totalRecords: 0 };

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(), [employees]);

  const filtered = entries.filter((e) => {
    if (departmentFilter !== "ALL" && e.department !== departmentFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return e.employeeName.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q);
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AllowanceDeductionEntry | null>(null);
  const [form, setForm] = useState(EMPTY_ENTRY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AllowanceDeductionEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setForm(EMPTY_ENTRY_FORM);
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(e: AllowanceDeductionEntry) {
    setForm({
      type: e.type as "ALLOWANCE" | "DEDUCTION",
      employeeId: e.employeeId,
      date: e.date.slice(0, 10),
      amount: String(e.amount),
      paymentMode: e.paymentMode as "BANK" | "CASH",
      remarks: e.remarks ?? "",
    });
    setEditing(e);
    setFormOpen(true);
  }

  async function refreshAll() {
    await Promise.all([refetch(), refetchSummary()]);
  }

  async function handleSubmit() {
    if (!form.employeeId) {
      toast.error("Select an employee");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        employeeId: form.employeeId,
        type: form.type,
        date: form.date,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        remarks: form.remarks || undefined,
      };
      if (editing) {
        await updateEntry({ variables: { id: editing.id, input } });
        toast.success("Entry updated");
      } else {
        await createEntry({ variables: { input } });
        toast.success("Entry saved");
      }
      setFormOpen(false);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteEntry({ variables: { id: deleteTarget.id } });
      toast.success("Entry deleted");
      setDeleteTarget(null);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setSubmitting(false);
    }
  }

  const cards = [
    { label: "Total Allowances", value: inr(summary.totalAllowances), caption: `additions for ${monthLabel(month, year)}`, icon: Wallet, valueClass: "text-info" },
    { label: "Total Deductions", value: inr(summary.totalDeductions), caption: `deductions for ${monthLabel(month, year)}`, icon: MinusCircle, valueClass: "text-danger" },
    {
      label: "Net Adjustment",
      value: `${summary.netAdjustment >= 0 ? "+" : ""}${inr(summary.netAdjustment)}`,
      caption: "net impact on payroll",
      icon: Banknote,
      valueClass: summary.netAdjustment >= 0 ? "text-success" : "text-danger",
    },
    { label: "Total Records", value: summary.totalRecords, caption: "entries in this period", icon: CalendarDays, valueClass: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setSummaryVisible((v) => !v)} className={cn("gap-1.5", BUTTON_PRESS)}>
          {summaryVisible ? "Hide Summary" : "Show Summary"}
        </Button>
        <Button onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
          <PlusCircle className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {summaryVisible && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={cn("mt-1 text-2xl font-bold tracking-tight", c.valueClass)}>{c.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.caption}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 pl-8" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="month"
                  className="bg-transparent text-sm text-foreground focus:outline-none"
                  value={monthValue}
                  onChange={(e) => e.target.value && setMonthValue(e.target.value)}
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-44">
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
                  <th className="w-10 px-4 py-2.5 font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Remarks</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Payment Mode</th>
                  <th className="w-16 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                      No entries for this period.
                    </td>
                  </tr>
                )}
                {filtered.map((e, idx) => (
                  <tr
                    key={e.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                    style={{ animationDelay: `${idx * 20}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.employeeCode}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{e.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.department}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs font-semibold uppercase", e.type === "ALLOWANCE" ? "text-info" : "text-danger")}>
                        {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.remarks || "—"}</td>
                    <td className={cn("px-4 py-2.5 text-right font-medium", e.type === "ALLOWANCE" ? "text-info" : "text-danger")}>
                      {inr(e.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.paymentMode}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => openEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setDeleteTarget(e)}>
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Allowance/Deduction" : "New Allowance/Deduction"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Entry Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.type === "ALLOWANCE" ? "default" : "outline"}
                  className={BUTTON_PRESS}
                  onClick={() => setForm({ ...form, type: "ALLOWANCE" })}
                >
                  Allowance
                </Button>
                <Button
                  type="button"
                  variant={form.type === "DEDUCTION" ? "default" : "outline"}
                  className={BUTTON_PRESS}
                  onClick={() => setForm({ ...form, type: "DEDUCTION" })}
                >
                  Deduction
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Search & Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.fullName} <span className="text-muted-foreground">({emp.employeeCode})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v as "BANK" | "CASH" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Bank (Payroll)</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Remarks</Label>
                <Input placeholder="e.g. BONUS, LOP" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(EMPTY_ENTRY_FORM)} className={cn("gap-1.5", BUTTON_PRESS)}>
              Reset
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
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

const COMPONENTS_QUERY = gql`
  query SalaryComponentsTabData {
    salaryComponents {
      id
      name
      code
      type
      calculationType
      value
      taxable
      active
      assignedEmployeeCount
    }
  }
`;
const EMPLOYEE_COMPONENTS_QUERY = gql`
  query EmployeeSalaryComponentsTabData($employeeId: String!) {
    employeeSalaryComponents(employeeId: $employeeId) {
      id
      salaryComponentName
      type
      calculationType
      amount
      effectiveFrom
      active
    }
  }
`;
const CREATE_COMPONENT = gql`
  mutation CreateSalaryComponentTab($input: CreateSalaryComponentInput!) {
    createSalaryComponent(input: $input) {
      id
    }
  }
`;
const ASSIGN_COMPONENT = gql`
  mutation AssignEmployeeSalaryComponentTab($input: AssignEmployeeSalaryComponentInput!) {
    assignEmployeeSalaryComponent(input: $input) {
      id
    }
  }
`;
const REMOVE_ASSIGNMENT = gql`
  mutation RemoveEmployeeSalaryComponentTab($id: String!) {
    removeEmployeeSalaryComponent(id: $id)
  }
`;

const EMPTY_COMPONENT_FORM = { name: "", code: "", type: "EARNING", calculationType: "FIXED", value: 0, taxable: true };

function SalaryComponentsPanel({ employees }: { employees: EmployeeLite[] }) {
  const { data, loading, refetch } = useQuery<{ salaryComponents: SalaryComponent[] }>(COMPONENTS_QUERY);
  const [createComponent] = useMutation(CREATE_COMPONENT);
  const [assignComponent] = useMutation(ASSIGN_COMPONENT);
  const [removeAssignment] = useMutation(REMOVE_ASSIGNMENT);
  const [loadEmployeeComponents, employeeComponentsResult] = useLazyQuery<{ employeeSalaryComponents: EmployeeSalaryComponent[] }>(
    EMPLOYEE_COMPONENTS_QUERY,
  );

  const components = data?.salaryComponents ?? [];

  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [componentForm, setComponentForm] = useState(EMPTY_COMPONENT_FORM);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assignForm, setAssignForm] = useState({ salaryComponentId: "", amount: "", effectiveFrom: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateComponent() {
    if (!componentForm.name || !componentForm.code) {
      toast.error("Name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      await createComponent({ variables: { input: componentForm } });
      toast.success("Salary component created");
      setComponentDialogOpen(false);
      setComponentForm(EMPTY_COMPONENT_FORM);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create component");
    } finally {
      setSubmitting(false);
    }
  }

  function openAssignDialog(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setAssignForm({ salaryComponentId: "", amount: "", effectiveFrom: new Date().toISOString().slice(0, 10) });
    setAssignDialogOpen(true);
    loadEmployeeComponents({ variables: { employeeId } });
  }

  async function handleAssign() {
    if (!assignForm.salaryComponentId) {
      toast.error("Select a component");
      return;
    }
    setSubmitting(true);
    try {
      await assignComponent({
        variables: {
          input: {
            employeeId: selectedEmployeeId,
            salaryComponentId: assignForm.salaryComponentId,
            amount: assignForm.amount ? Number(assignForm.amount) : undefined,
            effectiveFrom: assignForm.effectiveFrom,
          },
        },
      });
      toast.success("Component assigned");
      setAssignForm({ salaryComponentId: "", amount: "", effectiveFrom: new Date().toISOString().slice(0, 10) });
      loadEmployeeComponents({ variables: { employeeId: selectedEmployeeId } });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign component");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveAssignment(id: string) {
    setSubmitting(true);
    try {
      await removeAssignment({ variables: { id } });
      toast.success("Assignment removed");
      loadEmployeeComponents({ variables: { employeeId: selectedEmployeeId } });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove assignment");
    } finally {
      setSubmitting(false);
    }
  }

  const earnings = components.filter((c) => c.type === "EARNING");
  const deductions = components.filter((c) => c.type === "DEDUCTION");
  const withOverrides = components.filter((c) => c.assignedEmployeeCount > 0).length;

  const stats = [
    { label: "Total Components", value: components.length, icon: Settings2, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Earnings", value: earnings.length, icon: PlusCircle, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
    { label: "Deductions", value: deductions.length, icon: MinusCircle, borderClass: "border-l-danger", iconBg: "bg-danger-bg text-danger" },
    { label: "In Use", value: withOverrides, icon: Users, borderClass: "border-l-info", iconBg: "bg-info-bg text-info" },
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
            <p className="text-sm text-muted-foreground">{components.length} component{components.length === 1 ? "" : "s"}</p>
            <Button onClick={() => setComponentDialogOpen(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Banknote className="h-4 w-4" />
              New Component
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Calculation</th>
                  <th className="px-4 py-2.5 font-medium text-right">Value</th>
                  <th className="px-4 py-2.5 font-medium">Taxable</th>
                  <th className="px-4 py-2.5 font-medium text-right">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {!loading && components.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No salary components configured yet.
                    </td>
                  </tr>
                )}
                {components.map((c, idx) => (
                  <tr
                    key={c.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {c.name} <span className="text-xs text-muted-foreground">({c.code})</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={c.type === "EARNING" ? "success" : "danger"}>{titleCase(c.type)}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{titleCase(c.calculationType)}</td>
                    <td className="px-4 py-2.5 text-right">{c.calculationType === "PERCENTAGE" ? `${c.value}%` : inr(c.value)}</td>
                    <td className="px-4 py-2.5">{c.taxable ? "Yes" : "No"}</td>
                    <td className="px-4 py-2.5 text-right">{c.assignedEmployeeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Per-employee assignment</p>
          <div className="flex flex-wrap gap-2">
            {employees.map((e) => (
              <Button key={e.id} variant="outline" size="sm" onClick={() => openAssignDialog(e.id)} className={BUTTON_PRESS}>
                {e.fullName}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New salary component</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={componentForm.name} onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={componentForm.code} onChange={(e) => setComponentForm({ ...componentForm, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={componentForm.type} onValueChange={(v) => setComponentForm({ ...componentForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EARNING">Earning</SelectItem>
                  <SelectItem value="DEDUCTION">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Calculation</Label>
              <Select value={componentForm.calculationType} onValueChange={(v) => setComponentForm({ ...componentForm, calculationType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                  <SelectItem value="PERCENTAGE">% of basic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{componentForm.calculationType === "PERCENTAGE" ? "Percentage" : "Amount"}</Label>
              <Input type="number" min="0" value={componentForm.value} onChange={(e) => setComponentForm({ ...componentForm, value: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={componentForm.taxable} onCheckedChange={(v) => setComponentForm({ ...componentForm, taxable: v })} />
              <Label>Taxable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComponentDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreateComponent} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{employees.find((e) => e.id === selectedEmployeeId)?.fullName} — salary components</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(employeeComponentsResult.data?.employeeSalaryComponents ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{a.salaryComponentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {titleCase(a.type)} · {a.amount !== null ? inr(a.amount) : "default value"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => handleRemoveAssignment(a.id)} className={BUTTON_PRESS}>
                  <MinusCircle className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
            {employeeComponentsResult.data?.employeeSalaryComponents.length === 0 && (
              <p className="text-sm text-muted-foreground">No components assigned yet.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Add component</Label>
              <Select value={assignForm.salaryComponentId} onValueChange={(v) => setAssignForm({ ...assignForm, salaryComponentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {components.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Override amount</Label>
              <Input type="number" placeholder="Use default" value={assignForm.amount} onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Effective from</Label>
              <Input type="date" value={assignForm.effectiveFrom} onChange={(e) => setAssignForm({ ...assignForm, effectiveFrom: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className={BUTTON_PRESS}>
              Close
            </Button>
            <Button onClick={handleAssign} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AllowancesTab({ employees }: { employees: EmployeeLite[]; loading: boolean }) {
  const [view, setView] = useState<"entries" | "components">("entries");

  return (
    <div className="space-y-6">
      <Tabs value={view} onValueChange={(v) => setView(v as "entries" | "components")}>
        <TabsList>
          <TabsTrigger value="entries">Allowance & Deduction</TabsTrigger>
          <TabsTrigger value="components">Salary Components</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "entries" ? <EntriesPanel employees={employees} /> : <SalaryComponentsPanel employees={employees} />}
    </div>
  );
}
