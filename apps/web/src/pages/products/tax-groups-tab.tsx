import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Group, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@abms/ui";

const TAX_GROUPS_QUERY = gql`
  query TaxGroups {
    taxGroups {
      id
      name
      taxRates {
        id
        name
        rate
      }
    }
    taxRates {
      id
      name
      rate
    }
  }
`;

const CREATE_TAX_GROUP_MUTATION = gql`
  mutation CreateTaxGroup($input: CreateTaxGroupInput!) {
    createTaxGroup(input: $input) {
      id
    }
  }
`;

const DELETE_TAX_GROUP_MUTATION = gql`
  mutation DeleteTaxGroup($id: String!) {
    deleteTaxGroup(id: $id)
  }
`;

interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

interface TaxGroupRow {
  id: string;
  name: string;
  taxRates: TaxRateOption[];
}

export default function TaxGroupsTab() {
  const { data, loading, refetch } = useQuery<{ taxGroups: TaxGroupRow[]; taxRates: TaxRateOption[] }>(TAX_GROUPS_QUERY);
  const [createTaxGroup] = useMutation(CREATE_TAX_GROUP_MUTATION);
  const [deleteTaxGroup] = useMutation(DELETE_TAX_GROUP_MUTATION);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<TaxGroupRow | null>(null);
  const [name, setName] = useState("");
  const [selectedRateIds, setSelectedRateIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const taxRates = data?.taxRates ?? [];

  function toggleRate(id: string) {
    setSelectedRateIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTaxGroup({ variables: { input: { name, taxRateIds: selectedRateIds } } });
      toast.success(`${name} added`);
      setOpen(false);
      setName("");
      setSelectedRateIds([]);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tax group");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteTaxGroup({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tax group");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tax Groups</CardTitle>
          <CardDescription>Bundle multiple tax rates together, e.g. combined state + local tax.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Tax Group
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.taxGroups.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Tax rates</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.taxGroups.map((g) => (
                <tr key={g.id} className="border-b border-border last:border-0">
                  <td className="py-2">{g.name}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {g.taxRates.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        g.taxRates.map((r) => (
                          <Badge key={r.id} tone="info">
                            {r.name} ({r.rate}%)
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(g)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New tax group</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Name</Label>
              <Input id="group-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tax rates</Label>
              <div className="space-y-1.5 rounded-md border border-border p-3">
                {taxRates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tax rates yet — create one first.</p>
                ) : (
                  taxRates.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={selectedRateIds.includes(r.id)}
                        onChange={() => toggleRate(r.id)}
                      />
                      {r.name} ({r.rate}%)
                    </label>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create tax group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tax group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Group className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No tax groups yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first tax group.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first tax group
      </Button>
    </div>
  );
}
