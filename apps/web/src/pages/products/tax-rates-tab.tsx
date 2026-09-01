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
  Globe,
  Landmark,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
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
import { TaxRateFormDialog, type TaxRateFormRow, type TaxRateFormValues } from "./tax-rate-form-dialog";
import { ImportGlobalTaxRatesDialog } from "./import-global-tax-rates-dialog";

const TAX_RATES_QUERY = gql`
  query TaxRates {
    taxRates {
      id
      name
      code
      rate
      taxType
      country
      state
      isDefault
      active
      createdAt
      updatedAt
    }
  }
`;

const CREATE_TAX_RATE_MUTATION = gql`
  mutation CreateTaxRateFromList($input: CreateTaxRateInput!) {
    createTaxRate(input: $input) {
      id
    }
  }
`;

const UPDATE_TAX_RATE_MUTATION = gql`
  mutation UpdateTaxRateFromList($id: String!, $input: UpdateTaxRateInput!) {
    updateTaxRate(id: $id, input: $input) {
      id
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
  code: string | null;
  rate: number;
  taxType: "GST" | "VAT" | "SALES_TAX" | "OTHER";
  country: string | null;
  state: string | null;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const TAX_TYPE_LABELS: Record<TaxRateRow["taxType"], string> = {
  GST: "GST",
  VAT: "VAT",
  SALES_TAX: "Sales tax",
  OTHER: "Other",
};

type SortKey = "name" | "code" | "rate" | "taxType" | "country" | "state" | "active" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

function isWithinDays(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

export default function TaxRatesTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ taxRates: TaxRateRow[] }>(TAX_RATES_QUERY);
  const [createTaxRate] = useMutation(CREATE_TAX_RATE_MUTATION);
  const [updateTaxRate] = useMutation(UPDATE_TAX_RATE_MUTATION);
  const [deleteTaxRate] = useMutation(DELETE_TAX_RATE_MUTATION);

  const [deleting, setDeleting] = useState<TaxRateRow | null>(null);
  const [editing, setEditing] = useState<TaxRateFormRow | null | undefined>(undefined);
  const [viewing, setViewing] = useState<TaxRateRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showSummary, setShowSummary] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ code: true, state: true, created: true });

  const taxRates = data?.taxRates ?? [];

  const countries = useMemo(
    () => Array.from(new Set(taxRates.map((t) => t.country).filter((c): c is string => !!c))).sort(),
    [taxRates],
  );

  const stats = useMemo(() => {
    const total = taxRates.length;
    const active = taxRates.filter((t) => t.active).length;
    const avgRate = total === 0 ? 0 : taxRates.reduce((sum, t) => sum + t.rate, 0) / total;
    const recentlyUpdated = taxRates.filter((t) => isWithinDays(t.updatedAt, 7)).length;
    return { total, active, avgRate, countries: countries.length, recentlyUpdated };
  }, [taxRates, countries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return taxRates.filter((t) => {
      if (countryFilter !== "all" && t.country !== countryFilter) return false;
      if (typeFilter !== "all" && t.taxType !== typeFilter) return false;
      if (statusFilter === "active" && !t.active) return false;
      if (statusFilter === "inactive" && t.active) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.code?.toLowerCase().includes(q) ?? false) ||
        (t.country?.toLowerCase().includes(q) ?? false) ||
        (t.state?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [taxRates, search, countryFilter, typeFilter, statusFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dirMul;
        case "code":
          return (a.code ?? "").localeCompare(b.code ?? "") * dirMul;
        case "rate":
          return (a.rate - b.rate) * dirMul;
        case "taxType":
          return TAX_TYPE_LABELS[a.taxType].localeCompare(TAX_TYPE_LABELS[b.taxType]) * dirMul;
        case "country":
          return (a.country ?? "").localeCompare(b.country ?? "") * dirMul;
        case "state":
          return (a.state ?? "").localeCompare(b.state ?? "") * dirMul;
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
      await deleteTaxRate({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tax rate");
    } finally {
      setDeleting(null);
    }
  }

  async function handleSaveEdit(values: TaxRateFormValues, id?: string) {
    const input = {
      name: values.name,
      code: values.code || undefined,
      rate: Number(values.rate),
      taxType: values.taxType,
      country: values.country || undefined,
      state: values.state || undefined,
      isDefault: values.isDefault,
      active: values.active,
    };
    if (id) {
      await updateTaxRate({ variables: { id, input } });
      toast.success(`${values.name} updated`);
    } else {
      await createTaxRate({ variables: { input } });
      toast.success(`${values.name} created`);
    }
    await refetch();
  }

  async function handleToggleActive(row: TaxRateRow) {
    try {
      await updateTaxRate({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tax rate");
    }
  }

  async function handleImportGlobal(
    rates: Array<{ name: string; code: string; rate: number; taxType: string; country: string; state?: string }>,
  ) {
    for (const r of rates) {
      await createTaxRate({
        variables: { input: { name: r.name, code: r.code, rate: r.rate, taxType: r.taxType, country: r.country, state: r.state } },
      });
    }
    await refetch();
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Tax Rates</h2>
          <p className="text-sm text-muted-foreground">Configure tax rates for different regions and product categories</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="xs" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button
            variant="outline"
            size="xs"
            className={cn("gap-1.5", BUTTON_PRESS)}
            onClick={() => toast.success("Importing tax rates from file… (Demo)")}
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button
            variant="outline"
            size="xs"
            className={cn("gap-1.5", BUTTON_PRESS)}
            onClick={() => toast.success("Exporting tax rates… (Demo)")}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="xs" onClick={() => setImportOpen(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
            <Globe className="h-3.5 w-3.5" /> Import Global Tax Rates
          </Button>
          <Button size="xs" onClick={() => goWithExit("/products/tax-rates/new")} disabled={leaving} className={cn("gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" /> Add Tax Rate
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Tax Rates", value: stats.total, icon: Landmark, iconClass: "text-slate-500", footer: `${stats.active} Active` },
            { label: "Average Rate", value: `${stats.avgRate.toFixed(2)}%`, icon: Calculator, iconClass: "text-emerald-500", footer: "Across all rates" },
            { label: "Countries", value: stats.countries, icon: Globe, iconClass: "text-blue-500", footer: "Configured countries" },
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
          <h3 className="text-sm font-semibold text-foreground">Tax Rates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage tax rates for invoicing.</p>
        </div>
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Search tax rates..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Countries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(Object.keys(TAX_TYPE_LABELS) as TaxRateRow["taxType"][]).map((t) => (
                <SelectItem key={t} value={t}>{TAX_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
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
          ) : taxRates.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/tax-rates/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No tax rates match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Tax Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.code && <SortHeader label="Tax Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <SortHeader label="Rate" k="rate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Type" k="taxType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Country" k="country" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.state && <SortHeader label="State" k="state" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.created && <SortHeader label="Created" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <th className="px-4 py-2.5 font-medium text-center w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors"><Settings2 className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["code", "state", "created"] as const).map((col) => (
                              <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                                <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                                {col === "code" ? "Tax Code" : col === "state" ? "State" : "Created"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                        <td className="px-4 py-2.5 font-medium text-foreground">{t.name}</td>
                        {visibleCols.code && <td className="px-4 py-2.5 font-mono text-muted-foreground">{t.code || "—"}</td>}
                        <td className="px-4 py-2.5 text-muted-foreground">{t.rate}%</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{TAX_TYPE_LABELS[t.taxType]}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{t.country || "—"}</td>
                        {visibleCols.state && <td className="px-4 py-2.5 text-muted-foreground">{t.state || "—"}</td>}
                        <td className="px-4 py-2.5">
                          {t.active
                            ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">Active</span>
                            : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inactive</span>}
                          {t.isDefault && <Badge tone="info" className="ml-1">Default</Badge>}
                        </td>
                        {visibleCols.created && <td className="px-4 py-2.5 text-muted-foreground">{new Date(t.createdAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>}
                        <td className="px-4 py-2.5 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(t)}><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(t)}>
                                {t.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {t.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleting(t)} className="text-danger focus:text-danger"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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
      <TaxRateFormDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} taxRate={editing ?? null} onSave={handleSaveEdit} />

      {/* View Details Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Tax rate details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Name", viewing.name],
                ["Code", viewing.code || "—"],
                ["Rate", `${viewing.rate}%`],
                ["Type", TAX_TYPE_LABELS[viewing.taxType]],
                ["Country", viewing.country || "—"],
                ["State", viewing.state || "—"],
                ["Status", viewing.active ? "Active" : "Inactive"],
                ["Default", viewing.isDefault ? "Yes" : "No"],
                ["Created", new Date(viewing.createdAt).toLocaleString()],
                ["Updated", new Date(viewing.updatedAt).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border px-3 py-2">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewing(null)} className={BUTTON_PRESS}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Global Tax Rates */}
      <ImportGlobalTaxRatesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingCodes={new Set(taxRates.map((t) => t.code).filter((c): c is string => !!c))}
        onImport={handleImportGlobal}
      />

      {/* Delete Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Delete tax rate</DialogTitle></DialogHeader>
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Landmark className="h-5 w-5 text-muted-foreground" /></div>
      <div>
        <p className="text-sm font-medium">No tax rates yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first tax rate.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}><Plus className="h-4 w-4" />Add your first tax rate</Button>
    </div>
  );
}
