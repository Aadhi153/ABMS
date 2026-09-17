import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Clock, Pencil, Plus, Trash2, Users } from "lucide-react";
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
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, Shift } from "./types";
import RosterTab from "./roster-tab";

const SHIFTS_QUERY = gql`
  query ShiftsTabData {
    shifts {
      id
      name
      code
      startTime
      endTime
      breakMinutes
      gracePeriodMinutes
      workingDays
      active
      employeeCount
    }
  }
`;
const CREATE_SHIFT = gql`
  mutation CreateShiftTab($input: CreateShiftInput!) {
    createShift(input: $input) {
      id
    }
  }
`;
const UPDATE_SHIFT = gql`
  mutation UpdateShiftTab($id: String!, $input: CreateShiftInput!) {
    updateShift(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_SHIFT = gql`
  mutation DeleteShiftTab($id: String!) {
    deleteShift(id: $id)
  }
`;

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const EMPTY_FORM = { name: "", code: "", startTime: "09:00", endTime: "18:00", breakMinutes: 60, gracePeriodMinutes: 10, workingDays: ["MON", "TUE", "WED", "THU", "FRI"] };

export default function ShiftsTab({ loading: _shellLoading }: { employees: EmployeeLite[]; loading: boolean }) {
  const [view, setView] = useState<"types" | "roster">("types");
  const { data, loading, refetch } = useQuery<{ shifts: Shift[] }>(SHIFTS_QUERY);
  const [createShift] = useMutation(CREATE_SHIFT);
  const [updateShift] = useMutation(UPDATE_SHIFT);
  const [deleteShift] = useMutation(DELETE_SHIFT);

  const shifts = data?.shifts ?? [];
  const [editing, setEditing] = useState<Shift | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreating(true);
  }
  function openEdit(s: Shift) {
    setForm({ name: s.name, code: s.code ?? "", startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes, gracePeriodMinutes: s.gracePeriodMinutes, workingDays: s.workingDays });
    setEditing(s);
    setCreating(true);
  }

  function toggleDay(day: string) {
    setForm((f) => ({ ...f, workingDays: f.workingDays.includes(day) ? f.workingDays.filter((d) => d !== day) : [...f.workingDays, day] }));
  }

  async function handleSubmit() {
    if (!form.name || form.workingDays.length === 0) {
      toast.error("Name and at least one working day are required");
      return;
    }
    setSubmitting(true);
    try {
      const input = { ...form, code: form.code || undefined };
      if (editing) {
        await updateShift({ variables: { id: editing.id, input } });
        toast.success("Shift updated");
      } else {
        await createShift({ variables: { input } });
        toast.success("Shift created");
      }
      setCreating(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save shift");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteShift({ variables: { id: deleteTarget.id } });
      toast.success("Shift deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete shift");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = [
    { label: "Total Shifts", value: shifts.length, icon: Clock, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Active", value: shifts.filter((s) => s.active).length, icon: Clock, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
    { label: "Unassigned Employees", value: shifts.filter((s) => s.employeeCount === 0).length, icon: Users, borderClass: "border-l-warning", iconBg: "bg-warning-bg text-warning" },
  ];

  return (
    <div className="space-y-6">
      <Tabs value={view} onValueChange={(v) => setView(v as "types" | "roster")}>
        <TabsList>
          <TabsTrigger value="types">Shift Types</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "roster" ? (
        <RosterTab />
      ) : (
        <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{shifts.length} shift{shifts.length === 1 ? "" : "s"}</p>
            <Button onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-4 w-4" />
              New Shift
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Hours</th>
                  <th className="px-4 py-2.5 font-medium">Break</th>
                  <th className="px-4 py-2.5 font-medium">Working days</th>
                  <th className="px-4 py-2.5 font-medium text-right">Employees</th>
                  <th className="px-4 py-2.5 font-medium">Active</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {!loading && shifts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No shifts configured yet.
                    </td>
                  </tr>
                )}
                {shifts.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {s.name}
                      {s.code && <span className="ml-1.5 text-xs text-muted-foreground">({s.code})</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {s.startTime} – {s.endTime}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.breakMinutes} min</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {s.workingDays.map((d) => (
                          <Badge key={d} tone="muted" className="text-[10px]">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{s.employeeCount}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={s.active ? "success" : "muted"}>{s.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setDeleteTarget(s)}>
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

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Break (minutes)</Label>
                <Input type="number" min="0" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Grace period (minutes)</Label>
                <Input type="number" min="0" value={form.gracePeriodMinutes} onChange={(e) => setForm({ ...form, gracePeriodMinutes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Working days</Label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS.map((day) => (
                  <label key={day} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={form.workingDays.includes(day)} onCheckedChange={() => toggleDay(day)} />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone. Shifts with employees assigned cannot be deleted.</p>
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
        </>
      )}
    </div>
  );
}
