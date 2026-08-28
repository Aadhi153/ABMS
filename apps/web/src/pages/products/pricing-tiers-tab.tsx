import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Boxes, Plus, Trash2 } from "lucide-react";
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

const PRICING_TIERS_QUERY = gql`
  query PricingTiers {
    pricingTiers {
      id
      name
      description
      discountPercent
      active
    }
  }
`;

const CREATE_PRICING_TIER_MUTATION = gql`
  mutation CreatePricingTier($input: CreatePricingTierInput!) {
    createPricingTier(input: $input) {
      id
    }
  }
`;

const DELETE_PRICING_TIER_MUTATION = gql`
  mutation DeletePricingTier($id: String!) {
    deletePricingTier(id: $id)
  }
`;

interface PricingTierRow {
  id: string;
  name: string;
  description: string | null;
  discountPercent: number;
  active: boolean;
}

export default function PricingTiersTab() {
  const { data, loading, refetch } = useQuery<{ pricingTiers: PricingTierRow[] }>(PRICING_TIERS_QUERY);
  const [createPricingTier] = useMutation(CREATE_PRICING_TIER_MUTATION);
  const [deletePricingTier] = useMutation(DELETE_PRICING_TIER_MUTATION);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<PricingTierRow | null>(null);
  const [form, setForm] = useState({ name: "", description: "", discountPercent: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPricingTier({
        variables: {
          input: {
            name: form.name,
            description: form.description || undefined,
            discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
          },
        },
      });
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm({ name: "", description: "", discountPercent: "" });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pricing tier");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deletePricingTier({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete pricing tier");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Pricing Tiers</CardTitle>
          <CardDescription>Customer-facing pricing tiers, e.g. Retail vs. Wholesale.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Tier
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.pricingTiers.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium">Discount</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.pricingTiers.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2 text-muted-foreground">{t.description || "—"}</td>
                  <td className="py-2">{t.discountPercent}%</td>
                  <td className="py-2">
                    <Badge tone={t.active ? "success" : "muted"}>{t.active ? "Active" : "Inactive"}</Badge>
                  </td>
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
            <DialogTitle>New pricing tier</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="tier-name">Name</Label>
              <Input id="tier-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-desc">Description</Label>
              <Input id="tier-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-discount">Discount (%)</Label>
              <Input
                id="tier-discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.discountPercent}
                onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create tier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete pricing tier</DialogTitle>
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
        <Boxes className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No pricing tiers yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first tier.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first tier
      </Button>
    </div>
  );
}
