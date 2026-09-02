import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  DollarSign,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
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
import { BUTTON_PRESS, CARD_HOVER, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";

const PRICE_LISTS_QUERY = gql`
  query PriceLists {
    priceLists {
      id
      name
      code
      description
      currency
      zone
      priceSyncEnabled
      productsAutoSyncEnabled
      startDate
      endDate
      isDefault
      active
      createdAt
      updatedAt
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

const UPDATE_PRICE_LIST_MUTATION = gql`
  mutation UpdatePriceListFromList($id: String!, $input: UpdatePriceListInput!) {
    updatePriceList(id: $id, input: $input) {
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

interface ProductOption { id: string; sku: string; name: string; sellPrice: number; }
interface PriceListItemRow { id: string; productId: string; productName?: string; price: number; }
interface PriceListRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  currency: string;
  zone: string | null;
  priceSyncEnabled: boolean;
  productsAutoSyncEnabled: boolean;
  startDate: string | null;
  endDate: string | null;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  items: PriceListItemRow[];
}

type SortKey = "name" | "code" | "currency" | "zone" | "priceSyncEnabled" | "productsAutoSyncEnabled" | "active";

function isExpired(endDate: string | null) {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

function YesNoPill({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-success-bg text-success">Yes</span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">No</span>
  );
}

export default function PriceListsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ priceLists: PriceListRow[]; products: ProductOption[] }>(PRICE_LISTS_QUERY);
  const [updatePriceList] = useMutation(UPDATE_PRICE_LIST_MUTATION);
  const [deletePriceList] = useMutation(DELETE_PRICE_LIST_MUTATION);
  const [upsertItem] = useMutation(UPSERT_PRICE_LIST_ITEM_MUTATION);

  const [deleting, setDeleting] = useState<PriceListRow | null>(null);
  const [managing, setManaging] = useState<PriceListRow | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ code: true, currency: true, zone: true });

  const priceLists = data?.priceLists ?? [];
  const products = data?.products ?? [];

  const stats = useMemo(() => {
    const total = priceLists.length;
    const active = priceLists.filter((l) => l.active).length;
    const priceSyncEnabled = priceLists.filter((l) => l.priceSyncEnabled).length;
    const expired = priceLists.filter((l) => isExpired(l.endDate)).length;
    return { total, active, priceSyncEnabled, expired };
  }, [priceLists]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return priceLists;
    return priceLists.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.code?.toLowerCase().includes(q) ?? false) ||
        l.currency.toLowerCase().includes(q) ||
        (l.zone?.toLowerCase().includes(q) ?? false),
    );
  }, [priceLists, search]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dirMul;
        case "code":
          return (a.code ?? "").localeCompare(b.code ?? "") * dirMul;
        case "currency":
          return a.currency.localeCompare(b.currency) * dirMul;
        case "zone":
          return (a.zone ?? "").localeCompare(b.zone ?? "") * dirMul;
        case "priceSyncEnabled":
          return (Number(a.priceSyncEnabled) - Number(b.priceSyncEnabled)) * dirMul;
        case "productsAutoSyncEnabled":
          return (Number(a.productsAutoSyncEnabled) - Number(b.productsAutoSyncEnabled)) * dirMul;
        case "active":
          return (Number(a.active) - Number(b.active)) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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

  async function handleToggleActive(row: PriceListRow) {
    try {
      await updatePriceList({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update price list");
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
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Price List</h2>
          <p className="text-sm text-muted-foreground">Manage product price lists</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button size="sm" onClick={() => goWithExit("/products/pricelist/new")} disabled={leaving} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            <Plus className="h-3.5 w-3.5" /> Create Price List
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Price Lists", value: stats.total, sub: `${stats.active} active`, icon: Layers, iconClass: "text-slate-500" },
            { label: "Active Price Lists", value: stats.active, sub: `${stats.total - stats.active} inactive`, icon: CheckCircle2, iconClass: "text-emerald-500" },
            { label: "Price Sync Enabled", value: stats.priceSyncEnabled, sub: "Auto-updating prices", icon: RefreshCw, iconClass: "text-blue-500" },
            { label: "Expired Price Lists", value: stats.expired, sub: "Past their valid-to date", icon: TriangleAlert, iconClass: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className={CARD_HOVER}>
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
            <Input className="pl-8 h-8 text-xs" placeholder="Search by name, code, currency, zone..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : priceLists.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/pricelist/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No price lists match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Price List Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.code && <SortHeader label="Price List Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      {visibleCols.currency && <SortHeader label="Currency" k="currency" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      {visibleCols.zone && <SortHeader label="Zone" k="zone" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <SortHeader label="Price Sync Enabled" k="priceSyncEnabled" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Products Auto Sync Enabled" k="productsAutoSyncEnabled" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-2.5 font-medium text-center w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors"><Settings2 className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["code", "currency", "zone"] as const).map((col) => (
                              <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                                <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                                {col === "code" ? "Price List Code" : col === "currency" ? "Currency" : "Zone"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((l) => (
                      <tr
                        key={l.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out"
                        onClick={() => goWithExit(`/products/pricelist/edit/${l.id}`)}
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">{l.name}</td>
                        {visibleCols.code && (
                          <td className="px-4 py-2.5">
                            {l.code ? (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{l.code}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {visibleCols.currency && <td className="px-4 py-2.5 text-muted-foreground">{l.currency}</td>}
                        {visibleCols.zone && (
                          <td className="px-4 py-2.5">
                            {l.zone ? (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{l.zone}</span>
                            ) : (
                              <span className="text-muted-foreground">All Zones</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2.5"><YesNoPill value={l.priceSyncEnabled} /></td>
                        <td className="px-4 py-2.5"><YesNoPill value={l.productsAutoSyncEnabled} /></td>
                        <td className="px-4 py-2.5">
                          {l.active
                            ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">Active</span>
                            : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inactive</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => goWithExit(`/products/pricelist/edit/${l.id}`)}><Pencil className="h-3.5 w-3.5" /> Edit Price List</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openManage(l)}><DollarSign className="h-3.5 w-3.5" /> Manage Prices</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(l)}>
                                {l.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {l.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
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

      {/* Delete Dialog */}
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
    </div>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button className={cn("flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap", active && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
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
