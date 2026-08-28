import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Landmark, Plus, Trash2 } from "lucide-react";
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

const TAX_RATES_QUERY = gql`
  query TaxRates {
    taxRates {
      id
      name
      rate
      isDefault
    }
  }
`;

const CREATE_TAX_RATE_MUTATION = gql`
  mutation CreateTaxRate($input: CreateTaxRateInput!) {
    createTaxRate(input: $input) {
      id
    }
  }
`;

const DELETE_TAX_RATE_MUTATION = gql`
  mutation DeleteTaxRate($id: String!) {
    deleteTaxRate(id: $id)
  }
`;

interface TaxRateRow {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
}

export default function TaxRatesTab() {
  const { data, loading, refetch } = useQuery<{ taxRates: TaxRateRow[] }>(TAX_RATES_QUERY);
  const [createTaxRate] = useMutation(CREATE_TAX_RATE_MUTATION);
  const [deleteTaxRate] = useMutation(DELETE_TAX_RATE_MUTATION);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<TaxRateRow | null>(null);
  const [form, setForm] = useState({ name: "", rate: "", isDefault: false });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTaxRate({ variables: { input: { name: form.name, rate: Number(form.rate), isDefault: form.isDefault } } });
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm({ name: "", rate: "", isDefault: false });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tax rate");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteTaxRate({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tax rate");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tax Rates</CardTitle>
          <CardDescription>Tax rates available when building invoices and sales orders.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Tax Rate
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.taxRates.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Rate</th>
                <th className="py-2 font-medium">Default</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.taxRates.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.rate}%</td>
                  <td className="py-2">{t.isDefault ? <Badge tone="info">Default</Badge> : "—"}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(t)}>
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
            <DialogTitle>New tax rate</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="tax-name">Name</Label>
              <Input id="tax-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-rate">Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tax-default"
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              <Label htmlFor="tax-default">Set as default</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create tax rate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tax rate</DialogTitle>
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
        <Landmark className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No tax rates yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first tax rate.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first tax rate
      </Button>
    </div>
  );
}
