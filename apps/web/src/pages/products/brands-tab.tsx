import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Settings2,
  Tags,
  Trash2,
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
  Skeleton,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";
import { CARD_HOVER, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";

const BRANDS_QUERY = gql`
  query Brands {
    brands {
      id
      name
      code
      description
      logoUrl
      active
      productsCount
      createdAt
    }
  }
`;

const UPDATE_BRAND_MUTATION = gql`
  mutation UpdateBrand($id: String!, $input: UpdateBrandInput!) {
    updateBrand(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_BRAND_MUTATION = gql`
  mutation DeleteBrand($id: String!) {
    deleteBrand(id: $id)
  }
`;

interface BrandRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  logoUrl: string | null;
  active: boolean;
  productsCount: number;
  createdAt: string;
}

type SortKey = "name" | "code" | "products" | "active" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

export default function BrandsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ brands: BrandRow[] }>(BRANDS_QUERY);
  const [updateBrand] = useMutation(UPDATE_BRAND_MUTATION);
  const [deleteBrand] = useMutation(DELETE_BRAND_MUTATION);

  const [deleting, setDeleting] = useState<BrandRow | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ code: true, description: true, created: true });

  const brands = data?.brands ?? [];
  const stats = useMemo(() => ({
    total: brands.length,
    active: brands.filter((b) => b.active).length,
    inactive: brands.filter((b) => !b.active).length,
    withProducts: brands.filter((b) => b.productsCount > 0).length,
    recent: brands.filter((b) => isWithinDays(b.createdAt, 30)).length,
  }), [brands]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands.filter((b) => {
      if (statusFilter === "active" && !b.active) return false;
      if (statusFilter === "inactive" && b.active) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.code?.toLowerCase().includes(q) ?? false) ||
        (b.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [brands, search, statusFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dirMul;
        case "code":
          return (a.code ?? "").localeCompare(b.code ?? "") * dirMul;
        case "products":
          return (a.productsCount - b.productsCount) * dirMul;
        case "active":
          return (Number(a.active) - Number(b.active)) * dirMul;
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dirMul;
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

  async function handleToggleActive(row: BrandRow) {
    try {
      await updateBrand({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update brand");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteBrand({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete brand");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Brands</h2>
          <p className="text-sm text-muted-foreground">Manage your product brands and their information</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button size="sm" onClick={() => goWithExit("/products/brands/new")} disabled={leaving} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            <Plus className="h-3.5 w-3.5" /> Add Brand
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Brands", value: stats.total, sub: `${stats.active} active`, icon: Tags, iconClass: "text-slate-500" },
            { label: "Active Brands", value: stats.active, sub: `${stats.inactive} inactive`, icon: CheckCircle2, iconClass: "text-emerald-500" },
            { label: "Brands with Products", value: stats.withProducts, sub: "Have products", icon: Package, iconClass: "text-blue-500" },
            { label: "Recent Brands", value: stats.recent, sub: "Created recently", icon: Clock, iconClass: "text-primary" },
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
          <h3 className="text-sm font-semibold text-foreground">Brand List</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Browse and manage all your product brands</p>
        </div>
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search brands..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`All (${brands.length})`}</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : brands.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/brands/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No brands match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium w-12"></th>
                      <SortHeader label="Brand" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.code && <SortHeader label="Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      {visibleCols.description && <th className="px-4 py-2.5 font-medium">Description</th>}
                      <SortHeader label="Products" k="products" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.created && <SortHeader label="Created" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <th className="px-4 py-2.5 font-medium text-center w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors"><Settings2 className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["code", "description", "created"] as const).map((col) => (
                              <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                                <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                                {col === "code" ? "Code" : col === "description" ? "Description" : "Created"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((b) => (
                      <tr
                        key={b.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out"
                        onClick={() => goWithExit(`/products/brands/edit/${b.id}`)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-muted">
                            {b.logoUrl ? <img src={b.logoUrl} alt="" className="h-full w-full object-cover" /> : <Tags className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{b.name}</td>
                        {visibleCols.code && (
                          <td className="px-4 py-2.5">
                            {b.code
                              ? <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">{b.code}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        )}
                        {visibleCols.description && <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{b.description || "—"}</td>}
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> {b.productsCount}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {b.active
                            ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">Active</span>
                            : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inactive</span>
                          }
                        </td>
                        {visibleCols.created && <td className="px-4 py-2.5 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>}
                        <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => goWithExit(`/products/brands/edit/${b.id}`)}><Pencil className="h-3.5 w-3.5" /> Edit Brand</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(b)}>
                                {b.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {b.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleting(b)} className="text-danger focus:text-danger"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Delete brand</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <span className="font-medium text-foreground">{deleting?.name}</span>? Products keep their other fields but lose this brand.</p>
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
      <button className={cn("flex items-center gap-1 hover:text-foreground transition-colors", active && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Tags className="h-5 w-5 text-muted-foreground" /></div>
      <div><p className="text-sm font-medium">No brands yet</p><p className="text-sm text-muted-foreground">Get started by adding your first brand.</p></div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}><Plus className="h-4 w-4" />Add your first brand</Button>
    </div>
  );
}
