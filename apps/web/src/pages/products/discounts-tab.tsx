import { useState } from "react";
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
  toast,
} from "@abms/ui";
import { DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";
import { BUTTON_PRESS, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";

const DISCOUNTS_QUERY = gql`
  query Discounts {
    discounts {
      id
      name
      type
      value
      startDate
      endDate
      appliesTo
      category {
        id
        name
      }
      brand {
        id
        name
      }
      usageLimit
      couponCode
      active
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
  startDate: string | null;
  endDate: string | null;
  appliesTo: "ALL" | "CATEGORY" | "BRAND";
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  usageLimit: number | null;
  couponCode: string | null;
  active: boolean;
}

function appliesToLabel(d: DiscountRow) {
  if (d.appliesTo === "CATEGORY") return `Category: ${d.category?.name ?? "—"}`;
  if (d.appliesTo === "BRAND") return `Brand: ${d.brand?.name ?? "—"}`;
  return "All products";
}

export default function DiscountsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ discounts: DiscountRow[] }>(DISCOUNTS_QUERY);
  const [deleteDiscount] = useMutation(DELETE_DISCOUNT_MUTATION);
  const [deleting, setDeleting] = useState<DiscountRow | null>(null);

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
    <Card className={leaving ? LIST_EXIT : LIST_ENTER}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Discounts</CardTitle>
          <CardDescription>Reusable discount rules for promotions and clearance pricing.</CardDescription>
        </div>
        <Button size="sm" onClick={() => goWithExit("/products/discounts/new")} disabled={leaving} className={BUTTON_PRESS}>
          <Plus className="h-4 w-4" />
          New Discount
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.discounts.length === 0 ? (
          <EmptyState onAdd={() => goWithExit("/products/discounts/new")} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Value</th>
                <th className="py-2 font-medium">Applies to</th>
                <th className="py-2 font-medium">Coupon</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.discounts.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-border last:border-0 animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
                >
                  <td className="py-2">{d.name}</td>
                  <td className="py-2">
                    <Badge tone="info">{d.type === "PERCENTAGE" ? "Percentage" : "Fixed amount"}</Badge>
                  </td>
                  <td className="py-2">{d.type === "PERCENTAGE" ? `${d.value}%` : `$${d.value.toFixed(2)}`}</td>
                  <td className="py-2 text-muted-foreground">{appliesToLabel(d)}</td>
                  <td className="py-2 text-muted-foreground">
                    {d.couponCode || "—"}
                    {d.usageLimit != null && <span className="text-xs"> (limit {d.usageLimit})</span>}
                  </td>
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
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Delete discount</DialogTitle>
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
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Percent className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No discounts yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first discount.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first discount
      </Button>
    </div>
  );
}
