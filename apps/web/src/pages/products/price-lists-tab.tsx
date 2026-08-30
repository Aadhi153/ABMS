import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ChevronsUpDown, ChevronDown, ChevronUp, DollarSign, MoreHorizontal, Plus, RefreshCw, RefreshCwOff, Search, Trash2, TriangleAlert } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from "@abms/ui";
import { DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";
import { BUTTON_PRESS, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";
import { PriceListFormDialog, type PriceListFormValues } from "./price-list-form-dialog";

const PRICE_LISTS_QUERY = gql`
  query PriceLists {
    priceLists {
      id
      name
      description
      currency
      startDate
      endDate
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

const DELETE_PRICE_LIST_MUTATION = gql`
  mutation DeletePriceList($id: String!) {
    deletePriceList(id: $id)
  }
`;

const CREATE_PRICE_LIST_MUTATION = gql`
  mutation CreatePriceList($input: CreatePriceListInput!) {
    createPriceList(input: $input) {
      id
    }
  }
`;

const UPSERT_PRICE_LIST_ITEM_MUTATION = gql`
  mutation UpsertPriceListItem($input: UpsertPriceListItemInput!) {
    upsertPriceListItem(input: $input) {
      id
    }
  }
`;

interface ProductOption { id: string; sku: string; name: string; sellPrice: number; }
interface PriceListItemRow { id: string; productId: string; productName?: string; price: number; }
interface PriceListRow {
  id: string; name: string; description: string | null; currency: string;
  startDate: string | null; endDate: string | null; isDefault: boolean; items: PriceListItemRow[];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isExpired(endDate: string | null) {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

export default function PriceListsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ priceLists: PriceListRow[]; products: ProductOption[] }>(PRICE_LISTS_QUERY);
  const [deletePriceList] = useMutation(DELETE_PRICE_LIST_MUTATION);
  const [upsertItem] = useMutation(UPSERT_PRICE_LIST_ITEM_MUTATION);
  const [createPriceList] = useMutation(CREATE_PRICE_LIST_MUTATION, { refetchQueries: ["PriceLists"] });

  const [deleting, setDeleting] = useState<PriceListRow | null>(null);
  const [managing, setManaging] = useState<PriceListRow | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const priceLists = data?.priceLists ?? [];
  const products = data?.products ?? [];

  const stats = useMemo(() => ({
    total: priceLists.length,
    active: priceLists.filter((l) => !isExpired(l.endDate)).length,
    expired: priceLists.filter((l) => isExpired(l.endDate)).length,
    defaults: priceLists.filter((l) => l.isDefault).length,
  }), [priceLists]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return priceLists;
    return priceLists.filter((l) => l.name.toLowerCase().includes(q) || l.currency.toLowerCase().includes(q));
  }, [priceLists, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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

  async function handleSavePriceList(values: PriceListFormValues) {
    try {
      await createPriceList({
        variables: {
          input: {
            name: values.name,
            currency: values.currency,
            description: values.description || null,
            startDate: values.startDate || null,
            endDate: values.endDate || null,
            isDefault: values.isDefault,
          },
        },
      });
      toast.success("Price list created");
      setCreateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create price list");
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Price List</h2>
          <p className="text-sm text-muted-foreground">Manage product price lists and alternative pricing</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} disabled={leaving} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            <Plus className="h-3.5 w-3.5" /> Create Price List
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Price Lists", value: stats.total, sub: `${stats.active} active`, icon: DollarSign, iconClass: "text-slate-500" },
            { label: "Active Price Lists", value: stats.active, sub: `${stats.total - stats.expired} inactive`, icon: RefreshCw, iconClass: "text-emerald-500" },
            { label: "Price Sync Enabled", value: stats.active, sub: "Auto-updating prices", icon: RefreshCwOff, iconClass: "text-blue-500" },
            { label: "Expired Price Lists", value: stats.expired, sub: "Past their valid-to date", icon: TriangleAlert, iconClass: "text-amber-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <s.icon className={cn("h-4 w-4", s.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{s.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Price List</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Alternate price books you can apply per customer or channel</p>
        </div>
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search price lists..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : priceLists.length === 0 ? (
            <EmptyState onAdd={() => setCreateDialogOpen(true)} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No price lists match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium"><button className="flex items-center gap-1 hover:text-foreground transition-colors">Name <ChevronsUpDown className="h-3 w-3 opacity-60" /></button></th>
                      <th className="px-4 py-2.5 font-medium">Currency</th>
                      <th className="px-4 py-2.5 font-medium">Effective</th>
                      <th className="px-4 py-2.5 font-medium">Items</th>
                      <th className="px-4 py-2.5 font-medium">Default</th>
                      <th className="px-4 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                        <td className="px-4 py-2.5 font-medium text-foreground">{l.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{l.currency}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {l.startDate || l.endDate
                            ? <>{l.startDate ? formatDate(l.startDate) : "—"} – {l.endDate ? formatDate(l.endDate) : "—"}</>
                            : "—"
                          }
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{l.items.length}</td>
                        <td className="px-4 py-2.5">
                          {l.isDefault
                            ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">Default</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openManage(l)}><DollarSign className="h-3.5 w-3.5" /> Manage Prices</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleting(l)} className="text-danger focus:text-danger"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Manage Prices Dialog */}
      <Dialog open={!!managing} onOpenChange={(o) => !o && setManaging(null)}>
        <DialogContent className={cn(DIALOG_CONTENT_MOTION, "max-w-lg")} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Manage prices — {managing?.name}</DialogTitle></DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.sku} · list price ₹{p.sellPrice.toFixed(2)}</p>
                </div>
                <Input type="number" step="0.01" min="0" className="w-28" placeholder={p.sellPrice.toFixed(2)} value={priceDrafts[p.id] ?? ""} onChange={(e) => setPriceDrafts((d) => ({ ...d, [p.id]: e.target.value }))} onBlur={() => handleSaveItem(p.id)} disabled={savingProductId === p.id} />
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setManaging(null)} className={BUTTON_PRESS}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Delete price list</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <span className="font-medium text-foreground">{deleting?.name}</span>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} className={BUTTON_PRESS}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className={BUTTON_PRESS}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PriceListFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        priceList={null}
        onSave={handleSavePriceList}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><DollarSign className="h-5 w-5 text-muted-foreground" /></div>
      <div><p className="text-sm font-medium">No price lists yet</p><p className="text-sm text-muted-foreground">Get started by adding your first price list.</p></div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}><Plus className="h-4 w-4" />Add your first price list</Button>
    </div>
  );
}
