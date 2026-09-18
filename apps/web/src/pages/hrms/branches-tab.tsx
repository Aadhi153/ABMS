import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, cn, toast } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { Branch } from "./types";

const BRANCHES_QUERY = gql`
  query BranchesTabData {
    branches {
      id
      name
      code
      address
      active
      employeeCount
    }
  }
`;
const CREATE_BRANCH = gql`
  mutation CreateBranchTab($input: CreateBranchInput!) {
    createBranch(input: $input) {
      id
    }
  }
`;
const UPDATE_BRANCH = gql`
  mutation UpdateBranchTab($id: String!, $input: CreateBranchInput!) {
    updateBranch(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_BRANCH = gql`
  mutation DeleteBranchTab($id: String!) {
    deleteBranch(id: $id)
  }
`;

const EMPTY_FORM = { name: "", code: "", address: "" };

export default function BranchesTab() {
  const { data, loading, refetch } = useQuery<{ branches: Branch[] }>(BRANCHES_QUERY);
  const [createBranch] = useMutation(CREATE_BRANCH);
  const [updateBranch] = useMutation(UPDATE_BRANCH);
  const [deleteBranch] = useMutation(DELETE_BRANCH);

  const branches = data?.branches ?? [];
  const [editing, setEditing] = useState<Branch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(b: Branch) {
    setForm({ name: b.name, code: b.code ?? "", address: b.address ?? "" });
    setEditing(b);
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const input = { name: form.name, code: form.code || undefined, address: form.address || undefined };
      if (editing) {
        await updateBranch({ variables: { id: editing.id, input } });
        toast.success("Branch updated");
      } else {
        await createBranch({ variables: { input } });
        toast.success("Branch created");
      }
      setDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save branch");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteBranch({ variables: { id: deleteTarget.id } });
      toast.success("Branch deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete branch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{branches.length} branch{branches.length === 1 ? "" : "es"}</p>
        <Button onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
          <Plus className="h-4 w-4" />
          New Branch
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-4 py-2.5 font-medium">Address</th>
              <th className="px-4 py-2.5 font-medium text-right">Employees</th>
              <th className="px-4 py-2.5 font-medium">Active</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {!loading && branches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No branches configured yet.
                </td>
              </tr>
            )}
            {branches.map((b, idx) => (
              <tr
                key={b.id}
                className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
              >
                <td className="px-4 py-2.5 font-medium text-foreground">{b.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{b.code ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{b.address ?? "—"}</td>
                <td className="px-4 py-2.5 text-right">{b.employeeCount}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={b.active ? "success" : "muted"}>{b.active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setDeleteTarget(b)}>
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
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New branch"}</DialogTitle>
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
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
          <p className="text-sm text-muted-foreground">Branches with employees assigned cannot be deleted.</p>
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
