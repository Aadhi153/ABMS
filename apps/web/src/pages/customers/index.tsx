import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Contact,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
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

interface Customer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  creditLimit: number | null;
  paymentTerms: string | null;
  active: boolean;
  orderCount: number;
  createdAt: string;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

const CUSTOMERS_QUERY = gql`
  query Customers {
    customers {
      id
      code
      name
      email
      phone
      creditLimit
      paymentTerms
      active
      orderCount
      createdAt
    }
  }
`;

const CUSTOMER_ORDERS_QUERY = gql`
  query CustomerOrders($customerId: String!) {
    customerOrders(customerId: $customerId) {
      id
      orderNumber
      status
      total
      createdAt
    }
  }
`;

const UPDATE_CUSTOMER_MUTATION = gql`
  mutation UpdateCustomerActive($id: String!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      active
    }
  }
`;

const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: String!) {
    deleteCustomer(id: $id)
  }
`;

type SortKey = "name" | "code" | "orders" | "active" | "createdAt";
type StatusFilter = "all" | "active" | "inactive";

export default function CustomersPage() {
  const navigate = useNavigate();
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ customers: Customer[] }>(CUSTOMERS_QUERY);
  const [updateCustomer] = useMutation(UPDATE_CUSTOMER_MUTATION);
  const [deleteCustomer] = useMutation(DELETE_CUSTOMER);

  const [detail, setDetail] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const customers = data?.customers ?? [];

  const stats = useMemo(() => {
    const active = customers.filter((c) => c.active).length;
    const withCredit = customers.filter((c) => c.creditLimit != null);
    const avgCreditLimit = withCredit.length
      ? withCredit.reduce((sum, c) => sum + (c.creditLimit ?? 0), 0) / withCredit.length
      : 0;
    return { total: customers.length, active, inactive: customers.length - active, avgCreditLimit };
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "inactive" && c.active) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [customers, search, statusFilter]);

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

  async function handleToggleActive(row: Customer) {
    try {
      await updateCustomer({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update customer");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteCustomer({ variables: { id: deleteTarget.id } });
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your business customers in a spreadsheet view</p>
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
            onClick={() => goWithExit("/customers/new")}
            disabled={leaving}
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
          >
            <Plus className="h-3.5 w-3.5" /> Add Customer
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
            { label: "Total Customers", value: stats.total, sub: `${stats.active} active`, icon: Contact, iconClass: "text-slate-500" },
            { label: "Active", value: stats.active, sub: "Live customers", icon: CheckCircle2, iconClass: "text-emerald-500" },
            { label: "Inactive", value: stats.inactive, sub: "Inactive customers", icon: PowerOff, iconClass: "text-rose-500" },
            { label: "Avg Credit Limit", value: `$${stats.avgCreditLimit.toFixed(0)}`, sub: "Average credit limit", icon: Wallet, iconClass: "text-primary" },
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
              placeholder="Search customers..."
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
          ) : customers.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/customers/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No customers match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="w-12 px-4 py-2.5 font-medium"></th>
                      <SortHeader label="Customer" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-2.5 font-medium">Email</th>
                      <th className="px-4 py-2.5 font-medium">Phone</th>
                      <th className="px-4 py-2.5 font-medium">Credit limit</th>
                      <SortHeader label="Orders" k="orders" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="w-10 px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c) => (
                      <tr
                        key={c.id}
                        className="animate-in fade-in slide-in-from-top-1 cursor-pointer border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                        onClick={() => setDetail(c)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                            <Contact className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                            {c.code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.email || "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.phone || "—"}</td>
                        <td className="px-4 py-2.5">{c.creditLimit != null ? `$${c.creditLimit.toFixed(2)}` : "—"}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={c.orderCount > 0 ? "info" : "muted"}>{c.orderCount}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={c.active ? "success" : "muted"}>{c.active ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/customers/edit/${c.id}`)}>
                                <Pencil className="h-3.5 w-3.5" /> Edit Customer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(c)}>
                                {c.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {c.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="text-danger focus:text-danger">
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
            <CustomerDetail
              customer={detail}
              onEdit={() => navigate(`/customers/edit/${detail.id}`)}
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
            This permanently removes the customer record. Customers with existing orders cannot be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Deleting…" : "Delete customer"}
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

function CustomerDetail({ customer, onEdit, onDelete }: { customer: Customer; onEdit: () => void; onDelete: () => void }) {
  const { data } = useQuery<{ customerOrders: OrderSummary[] }>(CUSTOMER_ORDERS_QUERY, {
    variables: { customerId: customer.id },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {customer.name}
          <Badge tone={customer.active ? "success" : "muted"}>{customer.active ? "Active" : "Inactive"}</Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Code</p>
          <p className="font-mono text-xs">{customer.code}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p>{customer.email || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Phone</p>
          <p>{customer.phone || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Credit limit</p>
          <p>{customer.creditLimit != null ? `$${customer.creditLimit.toFixed(2)}` : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Payment terms</p>
          <p>{customer.paymentTerms || "—"}</p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Order history</p>
        {!data?.customerOrders.length ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {data.customerOrders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 font-mono text-xs">{o.orderNumber}</td>
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
        <Contact className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No customers yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first customer.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first customer
      </Button>
    </div>
  );
}
