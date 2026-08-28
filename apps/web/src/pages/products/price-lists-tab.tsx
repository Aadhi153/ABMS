import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { DollarSign, Plus, Trash2 } from "lucide-react";
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

const PRICE_LISTS_QUERY = gql`
  query PriceLists {
    priceLists {
      id
      name
      isDefault
      items {
        id
        productId
        productName
        price
      }
    }
    products {
      id
      sku
      name
      sellPrice
    }
  }
`;

const CREATE_PRICE_LIST_MUTATION = gql`
  mutation CreatePriceList($input: CreatePriceListInput!) {
    createPriceList(input: $input) {
      id
    }
  }
`;

const DELETE_PRICE_LIST_MUTATION = gql`
  mutation DeletePriceList($id: String!) {
    deletePriceList(id: $id)
  }
`;

const UPSERT_PRICE_LIST_ITEM_MUTATION = gql`
  mutation UpsertPriceListItem($input: UpsertPriceListItemInput!) {
    upsertPriceListItem(input: $input) {
      id
    }
  }
`;

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  sellPrice: number;
}

interface PriceListItemRow {
  id: string;
  productId: string;
  productName?: string;
  price: number;
}

interface PriceListRow {
  id: string;
  name: string;
  isDefault: boolean;
  items: PriceListItemRow[];
}

export default function PriceListsTab() {
  const { data, loading, refetch } = useQuery<{ priceLists: PriceListRow[]; products: ProductOption[] }>(PRICE_LISTS_QUERY);
  const [createPriceList] = useMutation(CREATE_PRICE_LIST_MUTATION);
  const [deletePriceList] = useMutation(DELETE_PRICE_LIST_MUTATION);
  const [upsertItem] = useMutation(UPSERT_PRICE_LIST_ITEM_MUTATION);

  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<PriceListRow | null>(null);
  const [managing, setManaging] = useState<PriceListRow | null>(null);
  const [form, setForm] = useState({ name: "", isDefault: false });
  const [submitting, setSubmitting] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const products = data?.products ?? [];

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPriceList({ variables: { input: { name: form.name, isDefault: form.isDefault } } });
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm({ name: "", isDefault: false });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create price list");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deletePriceList({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete price list");
    } finally {
      setDeleting(null);
    }
  }

  function openManage(list: PriceListRow) {
    setManaging(list);
    const drafts: Record<string, string> = {};
    for (const p of products) {
      const existing = list.items.find((i) => i.productId === p.id);
      drafts[p.id] = existing ? String(existing.price) : "";
    }
    setPriceDrafts(drafts);
  }

  async function handleSaveItem(productId: string) {
    if (!managing) return;
    const value = priceDrafts[productId];
    if (value === undefined || value === "") return;
    setSavingProductId(productId);
    try {
      await upsertItem({ variables: { input: { priceListId: managing.id, productId, price: Number(value) } } });
      const updated = await refetch();
      const refreshed = updated.data.priceLists.find((l) => l.id === managing.id);
      if (refreshed) setManaging(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save price");
    } finally {
      setSavingProductId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Price List</CardTitle>
          <CardDescription>Alternate price books you can apply per customer or channel.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Price List
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.priceLists.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Default</th>
                <th className="py-2 font-medium">Items</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.priceLists.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="py-2">{l.name}</td>
                  <td className="py-2">{l.isDefault ? <Badge tone="info">Default</Badge> : "—"}</td>
                  <td className="py-2 text-muted-foreground">{l.items.length}</td>
                  <td className="py-2 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openManage(l)}>
                      Manage prices
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(l)}>
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
            <DialogTitle>New price list</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="pl-name">Name</Label>
              <Input id="pl-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="pl-default"
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              <Label htmlFor="pl-default">Set as default</Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create price list"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!managing} onOpenChange={(o) => !o && setManaging(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage prices — {managing?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.sku} · list price ${p.sellPrice.toFixed(2)}
                  </p>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-28"
                  placeholder={p.sellPrice.toFixed(2)}
                  value={priceDrafts[p.id] ?? ""}
                  onChange={(e) => setPriceDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  onBlur={() => handleSaveItem(p.id)}
                  disabled={savingProductId === p.id}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManaging(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete price list</DialogTitle>
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
        <DollarSign className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No price lists yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first price list.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first price list
      </Button>
    </div>
  );
}
