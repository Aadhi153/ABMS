import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, cn, toast } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { Grade } from "./types";
import { inr } from "./hrms-helpers";

const GRADES_QUERY = gql`
  query GradesTabData {
    grades {
      id
      name
      code
      level
      minSalary
      maxSalary
      description
      active
      employeeCount
    }
  }
`;
const CREATE_GRADE = gql`
  mutation CreateGradeTab($input: CreateGradeInput!) {
    createGrade(input: $input) {
      id
    }
  }
`;
const UPDATE_GRADE = gql`
  mutation UpdateGradeTab($id: String!, $input: CreateGradeInput!) {
    updateGrade(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_GRADE = gql`
  mutation DeleteGradeTab($id: String!) {
    deleteGrade(id: $id)
  }
`;

const EMPTY_FORM = { name: "", code: "", level: "", minSalary: "", maxSalary: "", description: "" };

export default function GradesTab() {
  const { data, loading, refetch } = useQuery<{ grades: Grade[] }>(GRADES_QUERY);
  const [createGrade] = useMutation(CREATE_GRADE);
  const [updateGrade] = useMutation(UPDATE_GRADE);
  const [deleteGrade] = useMutation(DELETE_GRADE);

  const grades = data?.grades ?? [];
  const [editing, setEditing] = useState<Grade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Grade | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(g: Grade) {
    setForm({
      name: g.name,
      code: g.code ?? "",
      level: g.level !== null ? String(g.level) : "",
      minSalary: g.minSalary !== null ? String(g.minSalary) : "",
      maxSalary: g.maxSalary !== null ? String(g.maxSalary) : "",
      description: g.description ?? "",
    });
    setEditing(g);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        name: form.name,
        code: form.code || undefined,
        level: form.level ? Number(form.level) : undefined,
        minSalary: form.minSalary ? Number(form.minSalary) : undefined,
        maxSalary: form.maxSalary ? Number(form.maxSalary) : undefined,
        description: form.description || undefined,
      };
      if (editing) {
        await updateGrade({ variables: { id: editing.id, input } });
        toast.success("Grade updated");
      } else {
        await createGrade({ variables: { input } });
        toast.success("Grade created");
      }
      setDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save grade");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteGrade({ variables: { id: deleteTarget.id } });
      toast.success("Grade deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete grade");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{grades.length} grade{grades.length === 1 ? "" : "s"}</p>
        <Button onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
          <Plus className="h-4 w-4" />
          New Grade
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium text-right">Level</th>
              <th className="px-4 py-2.5 font-medium text-right">Salary band</th>
              <th className="px-4 py-2.5 font-medium text-right">Employees</th>
              <th className="px-4 py-2.5 font-medium">Active</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {!loading && grades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Layers className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No grades configured yet.
                </td>
              </tr>
            )}
            {grades.map((g, idx) => (
              <tr
                key={g.id}
                className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
              >
                <td className="px-4 py-2.5 font-medium text-foreground">
                  {g.name}
                  {g.code && <span className="ml-1.5 text-xs text-muted-foreground">({g.code})</span>}
                </td>
                <td className="px-4 py-2.5 text-right">{g.level ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  {g.minSalary !== null || g.maxSalary !== null ? `${inr(g.minSalary ?? 0)} – ${inr(g.maxSalary ?? 0)}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">{g.employeeCount}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={g.active ? "success" : "muted"}>{g.active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => openEdit(g)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setDeleteTarget(g)}>
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New grade"}</DialogTitle>
          </DialogHeader>
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
              <Label>Level</Label>
              <Input type="number" min="1" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
            </div>
            <div />
            <div className="space-y-1.5">
              <Label>Min salary</Label>
              <Input type="number" min="0" value={form.minSalary} onChange={(e) => setForm({ ...form, minSalary: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Max salary</Label>
              <Input type="number" min="0" value={form.maxSalary} onChange={(e) => setForm({ ...form, maxSalary: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Grades with employees assigned cannot be deleted.</p>
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
