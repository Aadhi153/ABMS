import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Copy,
  Download,
  IndianRupee,
  MoreHorizontal,
  Pencil,
  Percent,
  PowerOff,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Ticket,
  Trash2,
  TrendingUp,
  Upload,
  Plus,
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
      category { id name }
      brand { id name }
      usageLimit
      usageCount
      minPurchaseAmount
      minQuantity
      couponCode
      active
      createdAt
      updatedAt
    }
  }
`;

const CREATE_DISCOUNT_MUTATION = gql`
  mutation CreateDiscountFromList($input: CreateDiscountInput!) {
    createDiscount(input: $input) {
      id
    }
  }
`;

const UPDATE_DISCOUNT_MUTATION = gql`
  mutation UpdateDiscountFromList($id: String!, $input: UpdateDiscountInput!) {
    updateDiscount(id: $id, input: $input) {
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
  startDate: string | null;
  endDate: string | null;
  appliesTo: "ALL" | "CATEGORY" | "BRAND";
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  usageLimit: number | null;
  usageCount: number;
  minPurchaseAmount: number | null;
  minQuantity: number | null;
  couponCode: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

type SortKey = "name" | "couponCode" | "value" | "usageCount" | "endDate" | "active";
type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | "PERCENTAGE" | "FIXED_AMOUNT";
type ActiveTab = "discounts" | "analytics";

function appliesToLabel(d: DiscountRow) {
  if (d.appliesTo === "CATEGORY") return `Category: ${d.category?.name ?? "—"}`;
  if (d.appliesTo === "BRAND") return `Brand: ${d.brand?.name ?? "—"}`;
  return "All products";
}

function validityInfo(d: DiscountRow) {
  if (!d.endDate) return { kind: "none" as const };
  const end = new Date(d.endDate).getTime();
  const now = Date.now();
  if (end < now) return { kind: "expired" as const };
  const daysLeft = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
  const endLabel = new Date(d.endDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return { kind: "active" as const, daysLeft, endLabel };
}

export default function DiscountsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ discounts: DiscountRow[] }>(DISCOUNTS_QUERY);
  const [createDiscount] = useMutation(CREATE_DISCOUNT_MUTATION);
  const [updateDiscount] = useMutation(UPDATE_DISCOUNT_MUTATION);
  const [deleteDiscount] = useMutation(DELETE_DISCOUNT_MUTATION);

  const [activeTab, setActiveTab] = useState<ActiveTab>("discounts");
  const [deleting, setDeleting] = useState<DiscountRow | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showSummary, setShowSummary] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ code: true, usage: true, conditions: true });

  const discounts = data?.discounts ?? [];

  const stats = useMemo(() => {
    const total = discounts.length;
    const active = discounts.filter((d) => d.active).length;
    const totalUsage = discounts.reduce((sum, d) => sum + d.usageCount, 0);
    const customerSavings = discounts.reduce(
      (sum, d) => sum + (d.type === "FIXED_AMOUNT" ? d.usageCount * d.value : 0),
      0,
    );
    const now = Date.now();
    const activeCampaigns = discounts.filter(
      (d) => d.active && (!d.endDate || new Date(d.endDate).getTime() >= now),
    ).length;
    return { total, active, totalUsage, customerSavings, activeCampaigns };
  }, [discounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return discounts.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (statusFilter === "active" && !d.active) return false;
      if (statusFilter === "inactive" && d.active) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || (d.couponCode?.toLowerCase().includes(q) ?? false);
    });
  }, [discounts, search, typeFilter, statusFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dirMul;
        case "couponCode":
          return (a.couponCode ?? "").localeCompare(b.couponCode ?? "") * dirMul;
        case "value":
          return (a.value - b.value) * dirMul;
        case "usageCount":
          return (a.usageCount - b.usageCount) * dirMul;
        case "endDate":
          return ((a.endDate ? new Date(a.endDate).getTime() : 0) - (b.endDate ? new Date(b.endDate).getTime() : 0)) * dirMul;
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
      await deleteDiscount({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete discount");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleActive(row: DiscountRow) {
    try {
      await updateDiscount({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update discount");
    }
  }

  async function handleDuplicate(row: DiscountRow) {
    try {
      await createDiscount({
        variables: {
          input: {
            name: `${row.name} (Copy)`,
            type: row.type,
            value: row.value,
            appliesTo: row.appliesTo,
            categoryId: row.appliesTo === "CATEGORY" ? row.category?.id || undefined : undefined,
            brandId: row.appliesTo === "BRAND" ? row.brand?.id || undefined : undefined,
            startDate: row.startDate || undefined,
            endDate: row.endDate || undefined,
            usageLimit: row.usageLimit ?? undefined,
            minPurchaseAmount: row.minPurchaseAmount ?? undefined,
            minQuantity: row.minQuantity ?? undefined,
            couponCode: row.couponCode || undefined,
          },
        },
      });
      toast.success(`${row.name} duplicated`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate discount");
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Discount Schemes</h2>
          <p className="text-sm text-muted-foreground">Manage your discount schemes across products and services</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
                <MoreHorizontal className="h-3.5 w-3.5" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.success("Importing discount schemes… (Demo)")}>
                <Upload className="h-4 w-4" /> Import
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Exporting discount schemes… (Demo)")}>
                <Download className="h-4 w-4" /> Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { refetch(); toast.success("Refreshed"); }}>
                <RotateCcw className="h-4 w-4" /> Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => goWithExit("/products/discounts/new")} disabled={leaving} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" /> Add Discount Scheme
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Discounts", value: stats.total, icon: Percent, iconClass: "text-slate-500", footer: `${stats.active} Active` },
            { label: "Total Usage", value: stats.totalUsage, icon: Ticket, iconClass: "text-blue-500", footer: "Times redeemed" },
            { label: "Customer Savings", value: `₹${stats.customerSavings.toFixed(2)}`, icon: IndianRupee, iconClass: "text-emerald-500", footer: "Total discount value" },
            { label: "Active Campaigns", value: stats.activeCampaigns, icon: TrendingUp, iconClass: "text-primary", footer: "Currently running" },
          ].map((s) => (
            <Card key={s.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <s.icon className={cn("h-4 w-4", s.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{s.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {(["discounts", "analytics"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors",
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "discounts" ? "Discounts" : "Analytics"}
          </button>
        ))}
      </div>

      {/* Main Card */}
      <Card>
        {activeTab === "discounts" && (
          <>
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Discount Scheme List</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your discount schemes across products and services</p>
            </div>
            <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-xs"
                  placeholder="Search discounts..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as TypeFilter); setCurrentPage(1); }}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setCurrentPage(1); }}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
        <CardContent className="p-0">
          {activeTab === "analytics" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <SlidersHorizontal className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Analytics coming soon</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Discount performance charts and redemption analytics will be available here.
              </p>
            </div>
          ) : loading ? (
            <p className="text-sm text-muted-foreground py-16 text-center">Loading…</p>
          ) : discounts.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/discounts/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No discount schemes match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.code && <SortHeader label="Code" k="couponCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <SortHeader label="Value" k="value" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.usage && <SortHeader label="Usage" k="usageCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <SortHeader label="Validity" k="endDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.conditions && <th className="px-4 py-2.5 font-medium">Conditions</th>}
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-2.5 font-medium text-center w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors"><Settings2 className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["code", "usage", "conditions"] as const).map((col) => (
                              <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                                <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                                {col === "code" ? "Code" : col === "usage" ? "Usage" : "Conditions"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((d) => {
                      const validity = validityInfo(d);
                      return (
                        <tr
                          key={d.id}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out"
                          onClick={() => goWithExit(`/products/discounts/edit/${d.id}`)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-foreground">{d.name}</div>
                            <div className="text-[11px] text-muted-foreground">{appliesToLabel(d)}</div>
                          </td>
                          {visibleCols.code && (
                            <td className="px-4 py-2.5">
                              {d.couponCode ? (
                                <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">{d.couponCode}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                d.type === "PERCENTAGE" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                              )}
                            >
                              {d.type === "PERCENTAGE" ? <Percent className="h-3 w-3" /> : <IndianRupee className="h-3 w-3" />}
                              {d.type === "PERCENTAGE" ? `${d.value}% off` : `₹${d.value.toFixed(2)} off`}
                            </span>
                          </td>
                          {visibleCols.usage && <td className="px-4 py-2.5 text-muted-foreground">{d.usageCount} used</td>}
                          <td className="px-4 py-2.5">
                            {validity.kind === "none" && <span className="text-muted-foreground">No expiry</span>}
                            {validity.kind === "expired" && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-danger-bg text-danger">Expired</span>
                            )}
                            {validity.kind === "active" && (
                              <div>
                                <div className="font-medium text-foreground">{validity.daysLeft} days left</div>
                                <div className="text-[11px] text-muted-foreground">Until {validity.endLabel}</div>
                              </div>
                            )}
                          </td>
                          {visibleCols.conditions && (
                            <td className="px-4 py-2.5">
                              {d.minPurchaseAmount == null && d.minQuantity == null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  {d.minPurchaseAmount != null && (
                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      Min ₹{d.minPurchaseAmount.toFixed(2)}
                                    </span>
                                  )}
                                  {d.minQuantity != null && (
                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      Buy {d.minQuantity} items
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-2.5">
                            {d.active
                              ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">Active</span>
                              : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inactive</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => goWithExit(`/products/discounts/edit/${d.id}`)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(d)}><Copy className="h-3.5 w-3.5" /> Duplicate</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(d)}>
                                  {d.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                  {d.active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleting(d)} className="text-danger focus:text-danger"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
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

      {/* Delete Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Delete discount scheme</DialogTitle></DialogHeader>
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Percent className="h-5 w-5 text-muted-foreground" /></div>
      <div>
        <p className="text-sm font-medium">No discount schemes yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first discount scheme.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}><Plus className="h-4 w-4" />Add your first discount scheme</Button>
    </div>
  );
}
