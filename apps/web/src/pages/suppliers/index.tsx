import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  Factory,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Trash2,
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
  Skeleton,
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "../products/dialog-motion";
import { CARD_HOVER, LIST_ENTER, LIST_EXIT, usePageTransition } from "../products/form-motion";

interface Supplier {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  paymentTerms: string | null;
  leadTime: number | null;
  active: boolean;
  orderCount: number;
  createdAt: string;
}

interface PurchaseSummary {
  id: string;
  poNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

const SUPPLIERS_QUERY = gql`
  query Suppliers {
    suppliers {
      id
      code
      name
      email
      phone
      paymentTerms
      leadTime
      active
      orderCount
      createdAt
    }
  }
`;

const SUPPLIER_PURCHASES_QUERY = gql`
  query SupplierPurchases($supplierId: String!) {
    supplierPurchases(supplierId: $supplierId) {
      id
      poNumber
      status
      total
      createdAt
    }
  }
`;

const UPDATE_SUPPLIER_MUTATION = gql`
  mutation UpdateSupplierActive($id: String!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id
      active
    }
  }
`;

const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($id: String!) {
    deleteSupplier(id: $id)
  }
`;

type SortKey = "name" | "code" | "orders" | "active" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ suppliers: Supplier[] }>(SUPPLIERS_QUERY);
  const [updateSupplier] = useMutation(UPDATE_SUPPLIER_MUTATION);
  const [deleteSupplier] = useMutation(DELETE_SUPPLIER);

  const [detail, setDetail] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const suppliers = data?.suppliers ?? [];

  const stats = useMemo(() => {
    const active = suppliers.filter((s) => s.active).length;
    const withLeadTime = suppliers.filter((s) => s.leadTime != null);
    const avgLeadTime = withLeadTime.length
      ? Math.round(withLeadTime.reduce((sum, s) => sum + (s.leadTime ?? 0), 0) / withLeadTime.length)
      : 0;
    return { total: suppliers.length, active, inactive: suppliers.length - active, avgLeadTime };
  }, [suppliers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (statusFilter === "active" && !s.active) return false;
      if (statusFilter === "inactive" && s.active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [suppliers, search, statusFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dirMul;
        case "code":
          return a.code.localeCompare(b.code) * dirMul;
        case "orders":
          return (a.orderCount - b.orderCount) * dirMul;
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

  async function handleToggleActive(row: Supplier) {
    try {
      await updateSupplier({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update supplier");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteSupplier({ variables: { id: deleteTarget.id } });
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete supplier");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage your business suppliers in a spreadsheet view</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
          >
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button
            size="sm"
            onClick={() => goWithExit("/suppliers/new")}
            disabled={leaving}
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
          >
            <Plus className="h-3.5 w-3.5" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out origin-top",
          showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0",
        )}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Suppliers", value: stats.total, sub: `${stats.active} active`, icon: Factory, iconClass: "text-slate-500" },
            { label: "Active", value: stats.active, sub: "Live suppliers", icon: CheckCircle2, iconClass: "text-emerald-500" },
            { label: "Inactive", value: stats.inactive, sub: "Inactive suppliers", icon: PowerOff, iconClass: "text-rose-500" },
            { label: "Avg Lead Time", value: `${stats.avgLeadTime} days`, sub: "Average delivery lead time", icon: Clock, iconClass: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <s.icon className={cn("h-4 w-4", s.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : s.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{s.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main card */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
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
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/suppliers/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No suppliers match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="w-12 px-4 py-2.5 font-medium"></th>
                      <SortHeader label="Supplier" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-2.5 font-medium">Email</th>
                      <th className="px-4 py-2.5 font-medium">Phone</th>
                      <th className="px-4 py-2.5 font-medium">Payment terms</th>
                      <SortHeader label="Orders" k="orders" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="w-10 px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((s) => (
                      <tr
                        key={s.id}
                        className="animate-in fade-in slide-in-from-top-1 cursor-pointer border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                        onClick={() => setDetail(s)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                            <Factory className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                            {s.code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.email || "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.phone || "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.paymentTerms || "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={s.orderCount > 0 ? "info" : "muted"}>{s.orderCount}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={s.active ? "success" : "muted"}>{s.active ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/suppliers/edit/${s.id}`)}>
                                <Pencil className="h-3.5 w-3.5" /> Edit Supplier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(s)}>
                                {s.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {s.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(s)} className="text-danger focus:text-danger">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
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

      {/* Detail panel */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={cn("max-w-lg", DIALOG_CONTENT_MOTION)} overlayClassName={DIALOG_OVERLAY_MOTION}>
          {detail && (
            <SupplierDetail
              supplier={detail}
              onEdit={() => navigate(`/suppliers/edit/${detail.id}`)}
              onDelete={() => setDeleteTarget(detail)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the supplier record. Suppliers with existing orders cannot be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Deleting…" : "Delete supplier"}
            </Button>
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
      <button className={cn("flex items-center gap-1 transition-colors hover:text-foreground", active && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
  );
}

function SupplierDetail({ supplier, onEdit, onDelete }: { supplier: Supplier; onEdit: () => void; onDelete: () => void }) {
  const { data } = useQuery<{ supplierPurchases: PurchaseSummary[] }>(SUPPLIER_PURCHASES_QUERY, {
    variables: { supplierId: supplier.id },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {supplier.name}
          <Badge tone={supplier.active ? "success" : "muted"}>{supplier.active ? "Active" : "Inactive"}</Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Code</p>
          <p className="font-mono text-xs">{supplier.code}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p>{supplier.email || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Phone</p>
          <p>{supplier.phone || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Payment terms</p>
          <p>{supplier.paymentTerms || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Lead time</p>
          <p>{supplier.leadTime != null ? `${supplier.leadTime} days` : "—"}</p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Purchase history</p>
        {!data?.supplierPurchases.length ? (
          <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {data.supplierPurchases.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 font-mono text-xs">{o.poNumber}</td>
                  <td className="py-1.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-1.5 text-right">${o.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDelete} className={BUTTON_PRESS}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button onClick={onEdit} className={BUTTON_PRESS}>
          Edit
        </Button>
      </DialogFooter>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center justify-center gap-3 py-12 text-center duration-300 ease-out">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Factory className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No suppliers yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first supplier.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first supplier
      </Button>
    </div>
  );
}
