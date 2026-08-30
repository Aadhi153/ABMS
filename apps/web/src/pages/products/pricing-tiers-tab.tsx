import { useState } from "react";
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
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";
import { PricingTierFormDialog, type PricingTierFormValues } from "./pricing-tier-form-dialog";

const PRICING_TIERS_QUERY = gql`
  query PricingTiers {
    pricingTiers {
      id
      name
      description
      discountPercent
      minOrderValue
      customerTag
      active
    }
  }
`;

const DELETE_PRICING_TIER_MUTATION = gql`
  mutation DeletePricingTier($id: String!) {
    deletePricingTier(id: $id)
  }
`;

const CREATE_PRICING_TIER_MUTATION = gql`
  mutation CreatePricingTier($input: CreatePricingTierInput!) {
    createPricingTier(input: $input) {
      id
    }
  }
`;

interface PricingTierRow {
  id: string;
  name: string;
  description: string | null;
  discountPercent: number;
  minOrderValue: number | null;
  customerTag: string | null;
  active: boolean;
}

import { DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";

const CUSTOMER_TAG_LABELS: Record<string, string> = { REGULAR: "Regular", ONE_TIME: "One-time", LEAD: "Lead" };

export default function PricingTiersTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ pricingTiers: PricingTierRow[] }>(PRICING_TIERS_QUERY);
  const [deletePricingTier] = useMutation(DELETE_PRICING_TIER_MUTATION);
  const [createPricingTier] = useMutation(CREATE_PRICING_TIER_MUTATION, { refetchQueries: ["PricingTiers"] });
  const [deleting, setDeleting] = useState<PricingTierRow | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  async function handleSaveTier(values: PricingTierFormValues) {
    try {
      await createPricingTier({
        variables: {
          input: {
            name: values.name,
            description: values.description || null,
            discountPercent: values.discountPercent ? parseFloat(values.discountPercent) : 0,
            minOrderValue: values.minOrderValue ? parseFloat(values.minOrderValue) : null,
            customerTag: values.customerTag || null,
            active: values.active,
          },
        },
      });
      toast.success("Pricing tier created");
      setCreateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create pricing tier");
    }
  }

  return (
    <Card className={leaving ? LIST_EXIT : LIST_ENTER}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Pricing Tiers</CardTitle>
          <CardDescription>Customer-facing pricing tiers, e.g. Retail vs. Wholesale.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)} disabled={leaving} className={BUTTON_PRESS}>
          <Plus className="h-4 w-4" />
          New Tier
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.pricingTiers.length === 0 ? (
          <EmptyState onAdd={() => setCreateDialogOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium">Discount</th>
                <th className="py-2 font-medium">Min. order</th>
                <th className="py-2 font-medium">Customer tag</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.pricingTiers.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
                >
                  <td className="py-2">{t.name}</td>
                  <td className="py-2 text-muted-foreground">{t.description || "—"}</td>
                  <td className="py-2">{t.discountPercent}%</td>
                  <td className="py-2 text-muted-foreground">{t.minOrderValue != null ? `$${t.minOrderValue.toFixed(2)}` : "—"}</td>
                  <td className="py-2">{t.customerTag ? <Badge tone="info">{CUSTOMER_TAG_LABELS[t.customerTag] ?? t.customerTag}</Badge> : "—"}</td>
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
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Delete pricing tier</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className={BUTTON_PRESS}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PricingTierFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        tier={null}
        onSave={handleSaveTier}
      />
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Boxes className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No pricing tiers yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first tier.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first tier
      </Button>
    </div>
  );
}
