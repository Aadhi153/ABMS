import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Download,
  Eye,
  Group,
  Landmark,
  MoreHorizontal,
  Pencil,
  Percent,
  PowerOff,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
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
import { BUTTON_PRESS, CARD_HOVER, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";
import { TaxGroupFormDialog, type TaxGroupFormRow, type TaxGroupFormValues } from "./tax-group-form-dialog";

const TAX_GROUPS_QUERY = gql`
  query TaxGroups {
    taxGroups {
      id
      name
      code
      active
      totalRate
      createdAt
      updatedAt
      taxRates {
        id
        name
        rate
      }
    }
    taxRates {
      id
      name
      rate
    }
  }
`;

const UPDATE_TAX_GROUP_MUTATION = gql`
  mutation UpdateTaxGroupFromList($id: String!, $input: UpdateTaxGroupInput!) {
    updateTaxGroup(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_TAX_GROUP_MUTATION = gql`
  mutation DeleteTaxGroup($id: String!) {
    deleteTaxGroup(id: $id)
  }
`;

interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

interface TaxGroupRow {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  totalRate: number;
  createdAt: string;
  updatedAt: string;
  taxRates: TaxRateOption[];
}

type SortKey = "name" | "code" | "totalRate" | "active" | "createdAt";

function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

export default function TaxGroupsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ taxGroups: TaxGroupRow[]; taxRates: TaxRateOption[] }>(TAX_GROUPS_QUERY);
  const [updateTaxGroup] = useMutation(UPDATE_TAX_GROUP_MUTATION);
  const [deleteTaxGroup] = useMutation(DELETE_TAX_GROUP_MUTATION);

  const [deleting, setDeleting] = useState<TaxGroupRow | null>(null);
  const [editing, setEditing] = useState<TaxGroupFormRow | null>(null);
  const [viewing, setViewing] = useState<TaxGroupRow | null>(null);
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ code: true, created: true });

  const taxGroups = data?.taxGroups ?? [];
  const taxRates = data?.taxRates ?? [];

  const stats = useMemo(() => {
    const totalGroups = taxGroups.length;
    const activeGroups = taxGroups.filter((g) => g.active).length;
    const avgRate = totalGroups === 0 ? 0 : taxGroups.reduce((sum, g) => sum + g.totalRate, 0) / totalGroups;
    const recentlyUpdated = taxGroups.filter((g) => isWithinDays(g.updatedAt, 7)).length;
    return { totalGroups, activeGroups, avgRate, totalRates: taxRates.length, recentlyUpdated };
  }, [taxGroups, taxRates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return taxGroups;
    return taxGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.code?.toLowerCase().includes(q) ?? false) ||
        g.taxRates.some((r) => r.name.toLowerCase().includes(q)),
    );
  }, [taxGroups, search]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dirMul;
        case "code":
          return (a.code ?? "").localeCompare(b.code ?? "") * dirMul;
        case "totalRate":
          return (a.totalRate - b.totalRate) * dirMul;
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

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteTaxGroup({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tax group");
    } finally {
      setDeleting(null);
    }
  }

  async function handleSaveEdit(values: TaxGroupFormValues, id: string) {
    const input = {
      name: values.name,
      code: values.code || undefined,
      active: values.active,
      taxRateIds: values.taxRateIds,
    };
    await updateTaxGroup({ variables: { id, input } });
    toast.success(`${values.name} updated`);
    await refetch();
  }

  async function handleToggleActive(row: TaxGroupRow) {
    try {
      await updateTaxGroup({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tax group");
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Tax Groups</h2>
          <p className="text-sm text-muted-foreground">Manage tax groups and their associated tax rates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
            onClick={() => toast.success("Importing tax groups… (Demo)")}
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
            onClick={() => toast.success("Exporting tax groups… (Demo)")}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => goWithExit("/products/taxgroups/new")} disabled={leaving} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" /> Add Tax Group
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Groups", value: stats.totalGroups, icon: Group, iconClass: "text-slate-500", footer: `${stats.activeGroups} Active` },
            { label: "Average Group Rate", value: `${stats.avgRate.toFixed(2)}%`, icon: Percent, iconClass: "text-emerald-500", footer: "Across all groups" },
            { label: "Total Tax Rates", value: stats.totalRates, icon: Landmark, iconClass: "text-blue-500", footer: "Assigned rates" },
            { label: "Recently Updated", value: stats.recentlyUpdated, icon: TrendingUp, iconClass: "text-primary", footer: "Last 7 days" },
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
          <h3 className="text-sm font-semibold text-foreground">Tax Group List</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage bundled tax groups.</p>
        </div>
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search by name, code, or tax rate..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-16 text-center">Loading…</p>
          ) : taxGroups.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/taxgroups/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No tax groups match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.code && <SortHeader label="Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <th className="px-4 py-2.5 font-medium">Tax Rates</th>
                      <SortHeader label="Total Rate" k="totalRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.created && <SortHeader label="Created" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <th className="px-4 py-2.5 font-medium text-center w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors"><Settings2 className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["code", "created"] as const).map((col) => (
                              <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                                <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                                {col === "code" ? "Code" : "Created"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((g) => (
                      <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                        <td className="px-4 py-2.5 font-medium text-foreground">{g.name}</td>
                        {visibleCols.code && (
                          <td className="px-4 py-2.5">
                            {g.code ? (
                              <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                {g.code}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {g.taxRates.length === 0 ? (
                            "—"
                          ) : (
                            g.taxRates.map((r) => (
                              <Badge key={r.id} tone="info" className="mr-1 mb-1">{r.name} ({r.rate}%)</Badge>
                            ))
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calculator className="h-3 w-3 text-muted-foreground" />
                            {g.totalRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {g.active
                            ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">Active</span>
                            : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inactive</span>}
                        </td>
                        {visibleCols.created && <td className="px-4 py-2.5 text-muted-foreground">{new Date(g.createdAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>}
                        <td className="px-4 py-2.5 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(g)}><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditing(g)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(g)}>
                                {g.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {g.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleting(g)} className="text-danger focus:text-danger"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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

      {/* Edit Dialog */}
      <TaxGroupFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        taxGroup={editing}
        taxRateOptions={taxRates}
        onSave={handleSaveEdit}
      />

      {/* View Details Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Tax group details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Name", viewing.name],
                ["Code", viewing.code || "—"],
                ["Total Rate", `${viewing.totalRate.toFixed(2)}%`],
                ["Status", viewing.active ? "Active" : "Inactive"],
                ["Created", new Date(viewing.createdAt).toLocaleString()],
                ["Updated", new Date(viewing.updatedAt).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border px-3 py-2">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
              <div className="col-span-2 rounded-md border border-border px-3 py-2">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Tax Rates</p>
                <div className="mt-1">
                  {viewing.taxRates.length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    viewing.taxRates.map((r) => (
                      <Badge key={r.id} tone="info" className="mr-1 mb-1">{r.name} ({r.rate}%)</Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewing(null)} className={BUTTON_PRESS}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Delete tax group</DialogTitle></DialogHeader>
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Group className="h-5 w-5 text-muted-foreground" /></div>
      <div>
        <p className="text-sm font-medium">No tax groups yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first tax group.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}><Plus className="h-4 w-4" />Add your first tax group</Button>
    </div>
  );
}
