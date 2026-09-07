import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, cn, toast } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { Designation } from "./types";

const DESIGNATIONS_QUERY = gql`
  query DesignationsTabData {
    designations {
      id
      name
      code
      description
      active
      employeeCount
    }
  }
`;
const CREATE_DESIGNATION = gql`
  mutation CreateDesignationTab($input: CreateDesignationInput!) {
    createDesignation(input: $input) {
      id
    }
  }
`;
const UPDATE_DESIGNATION = gql`
  mutation UpdateDesignationTab($id: String!, $input: CreateDesignationInput!) {
    updateDesignation(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_DESIGNATION = gql`
  mutation DeleteDesignationTab($id: String!) {
    deleteDesignation(id: $id)
  }
`;

const EMPTY_FORM = { name: "", code: "", description: "" };

export default function DesignationsTab() {
  const { data, loading, refetch } = useQuery<{ designations: Designation[] }>(DESIGNATIONS_QUERY);
  const [createDesignation] = useMutation(CREATE_DESIGNATION);
  const [updateDesignation] = useMutation(UPDATE_DESIGNATION);
  const [deleteDesignation] = useMutation(DELETE_DESIGNATION);

  const designations = data?.designations ?? [];
  const [editing, setEditing] = useState<Designation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(d: Designation) {
    setForm({ name: d.name, code: d.code ?? "", description: d.description ?? "" });
    setEditing(d);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const input = { name: form.name, code: form.code || undefined, description: form.description || undefined };
      if (editing) {
        await updateDesignation({ variables: { id: editing.id, input } });
        toast.success("Designation updated");
      } else {
        await createDesignation({ variables: { input } });
        toast.success("Designation created");
      }
      setDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save designation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteDesignation({ variables: { id: deleteTarget.id } });
      toast.success("Designation deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete designation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{designations.length} designation{designations.length === 1 ? "" : "s"}</p>
        <Button onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
          <Plus className="h-4 w-4" />
          New Designation
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium text-right">Employees</th>
              <th className="px-4 py-2.5 font-medium">Active</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {!loading && designations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Award className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No designations configured yet.
                </td>
              </tr>
            )}
            {designations.map((d, idx) => (
              <tr
                key={d.id}
                className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
              >
                <td className="px-4 py-2.5 font-medium text-foreground">{d.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.code ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.description ?? "—"}</td>
                <td className="px-4 py-2.5 text-right">{d.employeeCount}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={d.active ? "success" : "muted"}>{d.active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => openEdit(d)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setDeleteTarget(d)}>
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
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New designation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
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
          <p className="text-sm text-muted-foreground">Designations with employees assigned cannot be deleted.</p>
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
