import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Banknote, CalendarDays, Pencil, TrendingUp, UserCheck, Users } from "lucide-react";
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
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, SalaryIncrementRow } from "./types";
import { inr } from "./hrms-helpers";

const ROWS_QUERY = gql`
  query SalaryIncrementRowsTabData($branchId: String, $department: String, $search: String) {
    salaryIncrementRows(branchId: $branchId, department: $department, search: $search) {
      employeeId
      employeeCode
      employeeName
      department
      currentBasic
      currentDA
      currentHRA
      currentOtherAllowance
    }
  }
`;
const BRANCHES_QUERY = gql`
  query SalaryIncrementBranchesTabData {
    branches {
      id
      name
    }
  }
`;
const SAVE_INCREMENTS = gql`
  mutation SaveSalaryIncrementsTab($input: SaveSalaryIncrementsInput!) {
    saveSalaryIncrements(input: $input)
  }
`;

type Edit = { newBasic: number; newDA: number; newHRA: number; newOtherAllowance: number };

export default function SalaryIncrementTab({ employees }: { employees: EmployeeLite[] }) {
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [search, setSearch] = useState("");
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [editing, setEditing] = useState<SalaryIncrementRow | null>(null);
  const [editForm, setEditForm] = useState<Edit>({ newBasic: 0, newDA: 0, newHRA: 0, newOtherAllowance: 0 });
  const [saving, setSaving] = useState(false);

  const { data, loading, refetch } = useQuery<{ salaryIncrementRows: SalaryIncrementRow[] }>(ROWS_QUERY, {
    variables: {
      branchId: branchId === "ALL" ? undefined : branchId,
      department: department === "ALL" ? undefined : department,
      search: search || undefined,
    },
  });
  const { data: branchData } = useQuery<{ branches: { id: string; name: string }[] }>(BRANCHES_QUERY);
  const [saveIncrements] = useMutation(SAVE_INCREMENTS);

  const rows = data?.salaryIncrementRows ?? [];
  const branches = branchData?.branches ?? [];
  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(), [employees]);

  function rowValue(r: SalaryIncrementRow): Edit {
    return edits[r.employeeId] ?? { newBasic: r.currentBasic, newDA: r.currentDA, newHRA: r.currentHRA, newOtherAllowance: r.currentOtherAllowance };
  }

  const currentTotalBasic = rows.reduce((s, r) => s + r.currentBasic, 0);
  const newTotalBasic = rows.reduce((s, r) => s + rowValue(r).newBasic, 0);
  const estimatedIncrement = newTotalBasic - currentTotalBasic;

  const stats = [
    { label: "Eligible Employees", value: String(rows.length), icon: Users },
    { label: "Current Monthly Basic", value: inr(currentTotalBasic), icon: Banknote },
    { label: "Estimated Increment", value: `${estimatedIncrement >= 0 ? "+" : ""}${inr(estimatedIncrement)}`, icon: TrendingUp },
    { label: "New Monthly Basic", value: inr(newTotalBasic), icon: UserCheck },
  ];

  function openEdit(r: SalaryIncrementRow) {
    setEditing(r);
    setEditForm(rowValue(r));
  }

  function applyEdit() {
    if (!editing) return;
    setEdits((prev) => ({ ...prev, [editing.employeeId]: editForm }));
    setEditing(null);
  }

  async function handleSave() {
    const dirtyRows = rows.filter((r) => edits[r.employeeId]).map((r) => ({ employeeId: r.employeeId, ...edits[r.employeeId] }));
    if (dirtyRows.length === 0) {
      toast.error("No changes to save");
      return;
    }
    setSaving(true);
    try {
      await saveIncrements({ variables: { input: { effectiveDate, rows: dirtyRows } } });
      toast.success(`Saved increments for ${dirtyRows.length} employee${dirtyRows.length === 1 ? "" : "s"}`);
      setEdits({});
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save increments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setSummaryVisible((v) => !v)} className={cn("gap-1.5", BUTTON_PRESS)}>
          {summaryVisible ? "Hide Summary" : "Show Summary"}
        </Button>
        <Button onClick={handleSave} disabled={saving} className={cn("gap-1.5", BUTTON_PRESS)}>
          {saving ? "Saving…" : "Save Increments"}
        </Button>
      </div>

      {summaryVisible && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((w) => (
            <Card key={w.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{w.label}</p>
                  <w.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                className="bg-transparent text-sm text-foreground focus:outline-none"
                value={effectiveDate}
                onChange={(e) => e.target.value && setEffectiveDate(e.target.value)}
              />
            </div>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={department} onValueChange={setDepartment}>
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
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Code</th>
                  <th className="px-4 py-2.5 font-medium">Employee Name</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cur. Basic</th>
                  <th className="px-4 py-2.5 font-medium text-right">New Basic</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cur. DA</th>
                  <th className="px-4 py-2.5 font-medium text-right">New DA</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cur. HRA</th>
                  <th className="px-4 py-2.5 font-medium text-right">New HRA</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cur. Other Allow.</th>
                  <th className="px-4 py-2.5 font-medium text-right">New Other Allow.</th>
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">
                      No employees found for these filters.
                    </td>
                  </tr>
                )}
                {rows.map((r, idx) => {
                  const v = rowValue(r);
                  const dirty = !!edits[r.employeeId];
                  return (
                    <tr
                      key={r.employeeId}
                      className={cn(
                        "animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0",
                        dirty && "bg-success-bg/30",
                      )}
                      style={{ animationDelay: `${idx * 20}ms`, animationFillMode: "backwards" }}
                    >
                      <td className="px-4 py-2.5 text-primary">{r.employeeCode}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.department || "—"}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{inr(r.currentBasic)}</td>
                      <td className={cn("px-4 py-2.5 text-right", dirty ? "font-semibold text-success" : "text-foreground")}>{inr(v.newBasic)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{inr(r.currentDA)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">{inr(v.newDA)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{inr(r.currentHRA)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">{inr(v.newHRA)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{inr(r.currentOtherAllowance)}</td>
                      <td className="px-4 py-2.5 text-right text-foreground">{inr(v.newOtherAllowance)}</td>
                      <td className="px-4 py-2.5">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)} className={BUTTON_PRESS}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.employeeName} — revise salary</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>New Basic</Label>
              <Input type="number" min="0" value={editForm.newBasic} onChange={(e) => setEditForm({ ...editForm, newBasic: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>New DA</Label>
              <Input type="number" min="0" value={editForm.newDA} onChange={(e) => setEditForm({ ...editForm, newDA: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>New HRA</Label>
              <Input type="number" min="0" value={editForm.newHRA} onChange={(e) => setEditForm({ ...editForm, newHRA: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>New Other Allowance</Label>
              <Input
                type="number"
                min="0"
                value={editForm.newOtherAllowance}
                onChange={(e) => setEditForm({ ...editForm, newOtherAllowance: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={applyEdit} className={BUTTON_PRESS}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
