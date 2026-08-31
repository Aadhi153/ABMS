import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { CheckCircle2, Percent, Plus, Trash2, MoreHorizontal, ChevronUp, ChevronDown, RefreshCw, Search, XCircle } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showSummary, setShowSummary] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const discounts = data?.discounts ?? [];

  const stats = useMemo(() => {
    return {
      total: discounts.length,
      active: discounts.filter((d) => d.active).length,
      inactive: discounts.filter((d) => !d.active).length,
    };
  }, [discounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return discounts.filter((d) => {
      if (statusFilter === "active" && !d.active) return false;
      if (statusFilter === "inactive" && d.active) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.couponCode?.toLowerCase().includes(q) ?? false) ||
        (d.appliesTo === "CATEGORY" && d.category?.name.toLowerCase().includes(q)) ||
        (d.appliesTo === "BRAND" && d.brand?.name.toLowerCase().includes(q))
      );
    });
  }, [discounts, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Discounts</h2>
          <p className="text-sm text-muted-foreground">Reusable discount rules for promotions and clearance pricing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button size="sm" onClick={() => goWithExit("/products/discounts/new")} disabled={leaving} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" /> New Discount
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Discounts", value: stats.total, icon: Percent, iconClass: "text-slate-500", footer: "All discounts" },
            { label: "Active", value: stats.active, icon: CheckCircle2, iconClass: "text-emerald-500", footer: "Currently active" },
            { label: "Inactive", value: stats.inactive, icon: XCircle, iconClass: "text-slate-400", footer: "Not in use" },
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

      {/* Main Card */}
      <Card>
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Discount List</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage discount rules applied to orders</p>
        </div>
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search discounts..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
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
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-16 text-center">Loading…</p>
          ) : discounts.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/discounts/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No discounts match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Name</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Value</th>
                      <th className="px-4 py-2.5 font-medium">Applies to</th>
                      <th className="px-4 py-2.5 font-medium">Coupon</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((d) => (
                      <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                        <td className="px-4 py-2.5 font-medium text-foreground">{d.name}</td>
                        <td className="px-4 py-2.5"><Badge tone="info">{d.type === "PERCENTAGE" ? "Percentage" : "Fixed amount"}</Badge></td>
                        <td className="px-4 py-2.5">{d.type === "PERCENTAGE" ? `${d.value}%` : `$${d.value.toFixed(2)}`}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{appliesToLabel(d)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{d.couponCode || "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={d.active ? "success" : "muted"}>{d.active ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDeleting(d)} className="text-danger focus:text-danger"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
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
          <DialogHeader><DialogTitle>Delete discount</DialogTitle></DialogHeader>
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Percent className="h-5 w-5 text-muted-foreground" /></div>
      <div>
        <p className="text-sm font-medium">No discounts yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first discount.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}><Plus className="h-4 w-4" />Add your first discount</Button>
    </div>
  );
}
