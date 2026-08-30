import { useState } from "react";
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
  toast,
} from "@abms/ui";
import { DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";
import { BUTTON_PRESS, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";

const TAX_RATES_QUERY = gql`
  query TaxRates {
    taxRates {
      id
      name
      rate
      taxType
      region
      isDefault
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
  taxType: "GST" | "VAT" | "SALES_TAX" | "OTHER";
  region: string | null;
  isDefault: boolean;
}

const TAX_TYPE_LABELS: Record<TaxRateRow["taxType"], string> = {
  GST: "GST",
  VAT: "VAT",
  SALES_TAX: "Sales tax",
  OTHER: "Other",
};

export default function TaxRatesTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ taxRates: TaxRateRow[] }>(TAX_RATES_QUERY);
  const [deleteTaxRate] = useMutation(DELETE_TAX_RATE_MUTATION);
  const [deleting, setDeleting] = useState<TaxRateRow | null>(null);

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
    <Card className={leaving ? LIST_EXIT : LIST_ENTER}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Tax Rates</CardTitle>
          <CardDescription>Tax rates available when building invoices and sales orders.</CardDescription>
        </div>
        <Button size="sm" onClick={() => goWithExit("/products/tax-rates/new")} disabled={leaving} className={BUTTON_PRESS}>
          <Plus className="h-4 w-4" />
          New Tax Rate
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.taxRates.length === 0 ? (
          <EmptyState onAdd={() => goWithExit("/products/tax-rates/new")} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Rate</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Region</th>
                <th className="py-2 font-medium">Default</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.taxRates.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
                >
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.rate}%</td>
                  <td className="py-2 text-muted-foreground">{TAX_TYPE_LABELS[t.taxType]}</td>
                  <td className="py-2 text-muted-foreground">{t.region || "—"}</td>
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
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Delete tax rate</DialogTitle>
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
        <Landmark className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No tax rates yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first tax rate.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first tax rate
      </Button>
    </div>
  );
}
