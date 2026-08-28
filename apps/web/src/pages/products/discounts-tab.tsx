import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Percent, Plus, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@abms/ui";

const DISCOUNTS_QUERY = gql`
  query Discounts {
    discounts {
      id
      name
      type
      value
      active
    }
  }
`;

const CREATE_DISCOUNT_MUTATION = gql`
  mutation CreateDiscount($input: CreateDiscountInput!) {
    createDiscount(input: $input) {
      id
    }
  }
`;

const DELETE_DISCOUNT_MUTATION = gql`
  mutation DeleteDiscount($id: String!) {
    deleteDiscount(id: $id)
  }
`;

interface DiscountRow {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  active: boolean;
}

export default function DiscountsTab() {
  const { data, loading, refetch } = useQuery<{ discounts: DiscountRow[] }>(DISCOUNTS_QUERY);
  const [createDiscount] = useMutation(CREATE_DISCOUNT_MUTATION);
  const [deleteDiscount] = useMutation(DELETE_DISCOUNT_MUTATION);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<DiscountRow | null>(null);
  const [form, setForm] = useState<{ name: string; type: "PERCENTAGE" | "FIXED_AMOUNT"; value: string }>({
    name: "",
    type: "PERCENTAGE",
    value: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createDiscount({ variables: { input: { name: form.name, type: form.type, value: Number(form.value) } } });
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm({ name: "", type: "PERCENTAGE", value: "" });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create discount");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteDiscount({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete discount");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Discounts</CardTitle>
          <CardDescription>Reusable discount rules for promotions and clearance pricing.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Discount
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.discounts.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Value</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.discounts.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="py-2">{d.name}</td>
                  <td className="py-2">
                    <Badge tone="info">{d.type === "PERCENTAGE" ? "Percentage" : "Fixed amount"}</Badge>
                  </td>
                  <td className="py-2">{d.type === "PERCENTAGE" ? `${d.value}%` : `$${d.value.toFixed(2)}`}</td>
                  <td className="py-2">
                    <Badge tone={d.active ? "success" : "muted"}>{d.active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(d)}>
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
            <DialogTitle>New discount</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="disc-name">Name</Label>
              <Input id="disc-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "PERCENTAGE" | "FIXED_AMOUNT" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disc-value">{form.type === "PERCENTAGE" ? "Value (%)" : "Value ($)"}</Label>
              <Input
                id="disc-value"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create discount"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete discount</DialogTitle>
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
        <Percent className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No discounts yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first discount.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first discount
      </Button>
    </div>
  );
}
