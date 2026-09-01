import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ClipboardEdit,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  TrendingUp,
} from "lucide-react";
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
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from "@abms/ui";

const TABS = [
  { key: "levels" },
  { key: "movements" },
  { key: "adjustments" },
  { key: "alerts" },
  { key: "transfers" },
] as const;

interface Warehouse {
  id: string;
  name: string;
}

interface StockLevel {
  id: string;
  warehouse: Warehouse;
  quantity: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  variantName: string | null;
  unitOfMeasure: string;
  totalStock: number;
  costPrice: number;
  reorderThreshold: number;
  maxStockLevel: number | null;
  stockLevels: StockLevel[];
}

const PRODUCTS_QUERY = gql`
  query InventoryProducts {
    products {
      id
      sku
      name
      variantName
      unitOfMeasure
      totalStock
      costPrice
      reorderThreshold
      maxStockLevel
      stockLevels {
        id
        quantity
        warehouse {
          id
          name
        }
      }
    }
    warehouses {
      id
      name
      active
    }
  }
`;

const LOW_STOCK_QUERY = gql`
  query LowStockProducts {
    lowStockProducts {
      id
      sku
      name
      totalStock
      reorderThreshold
    }
  }
`;

const STOCK_ADJUSTMENTS_QUERY = gql`
  query StockAdjustments {
    stockAdjustments {
      id
      productId
      productName
      quantity
      reason
      createdByName
      createdAt
      warehouse {
        id
        name
      }
    }
  }
`;

const STOCK_MOVEMENTS_QUERY = gql`
  query StockMovements($filter: StockMovementFilterInput) {
    stockMovements(filter: $filter) {
      id
      productId
      productName
      type
      quantity
      reason
      createdByName
      createdAt
      warehouse {
        id
        name
      }
    }
  }
`;

const STOCK_TRANSFERS_QUERY = gql`
  query StockTransfers {
    stockTransfers {
      id
      productId
      productName
      quantity
      reason
      createdByName
      createdAt
      fromWarehouse {
        id
        name
      }
      toWarehouse {
        id
        name
      }
    }
  }
`;

const ADJUST_STOCK_MUTATION = gql`
  mutation AdjustStock($input: StockAdjustmentInput!) {
    adjustStock(input: $input) {
      id
    }
  }
`;

const TRANSFER_STOCK_MUTATION = gql`
  mutation TransferStock($input: TransferStockInput!) {
    transferStock(input: $input) {
      id
    }
  }
`;

export default function InventoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "levels";

  useEffect(() => {
    if (!TABS.some((t) => t.key === segment)) {
      navigate(`/inventory/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate]);

  const { data, loading, refetch } = useQuery<{ products: Product[]; warehouses: Warehouse[] }>(PRODUCTS_QUERY);
  const [adjustStock] = useMutation(ADJUST_STOCK_MUTATION);
  const [quickAdjustOpen, setQuickAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const products = data?.products ?? [];
  const warehouses = data?.warehouses ?? [];

  return (
    <div className="space-y-6">
      {tab !== "levels" && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock levels, movements, adjustments, alerts, and transfers across warehouses.</p>
        </div>
        {tab === "adjustments" && (
          <Button size="sm" onClick={() => setQuickAdjustOpen(true)}>
            <Plus className="h-4 w-4" />
            New Adjustment
          </Button>
        )}
        {tab === "transfers" && (
          <Button size="sm" onClick={() => setTransferOpen(true)}>
            <Plus className="h-4 w-4" />
            New Transfer
          </Button>
        )}
      </div>
      )}

      {tab === "levels" && (
        <StockByWarehouseTab products={products} warehouses={warehouses} loading={loading} onRefresh={refetch} />
      )}
      {tab === "movements" && <StockMovementsTab products={products} warehouses={warehouses} />}
      {tab === "adjustments" && <StockAdjustmentsTab onNewAdjustment={() => setQuickAdjustOpen(true)} />}
      {tab === "alerts" && <LowStockTab />}
      {tab === "transfers" && <StockTransfersTab onNewTransfer={() => setTransferOpen(true)} />}

      <Dialog open={quickAdjustOpen} onOpenChange={setQuickAdjustOpen}>
        <DialogContent>
          {quickAdjustOpen && (
            <QuickAdjustForm
              products={products}
              warehouses={warehouses}
              submitting={submitting}
              onSubmit={async (productId, warehouseId, quantity, reason) => {
                setSubmitting(true);
                try {
                  await adjustStock({ variables: { input: { productId, warehouseId, quantity, reason } } });
                  toast.success("Stock adjusted");
                  setQuickAdjustOpen(false);
                  await refetch();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to adjust stock");
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          {transferOpen && <TransferForm products={products} warehouses={warehouses} onClose={() => setTransferOpen(false)} onSaved={refetch} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Hover lift for stat/summary cards — shadow + a 2px rise, no width/height change so grid sizing stays fixed.
 * Mirrors the products module's CARD_HOVER (apps/web/src/pages/products/form-motion.ts) for a consistent feel. */
const CARD_HOVER = "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30";

function StockSummaryCards({ products, warehouses, loading }: { products: Product[]; warehouses: Warehouse[]; loading: boolean }) {
  const totalItems = products.length;
  const lowStockCount = products.filter((p) => p.totalStock <= p.reorderThreshold).length;
  const totalValue = products.reduce((sum, p) => sum + p.totalStock * p.costPrice, 0);
  const stockedWarehouseIds = new Set(
    products.flatMap((p) => p.stockLevels.filter((sl) => sl.quantity > 0).map((sl) => sl.warehouse.id)),
  );
  const locationsWithStock = warehouses.filter((w) => stockedWarehouseIds.has(w.id)).length;

  const widgets = [
    {
      label: "Total Items",
      value: loading ? "—" : String(totalItems),
      icon: Package,
      iconClass: "text-slate-500",
      footer: "Items in Stock",
    },
    {
      label: "Low Stock",
      value: loading ? "—" : String(lowStockCount),
      icon: AlertTriangle,
      iconClass: "text-primary",
      footer: "Below Minimum",
    },
    {
      label: "Stock Value",
      value: loading ? "—" : `₹${totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      iconClass: "text-emerald-500",
      footer: "Total Inventory Value",
    },
    {
      label: "Locations",
      value: loading ? "—" : String(locationsWithStock),
      icon: MapPin,
      iconClass: "text-purple-500",
      footer: "Warehouses with Stock",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {widgets.map((w) => (
        <Card key={w.label} className={CARD_HOVER}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{w.label}</span>
              <w.icon className={cn("h-4 w-4", w.iconClass)} />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{w.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{w.footer}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "OVER_STOCK";

const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
  OVER_STOCK: "Over Stock",
};

const STOCK_STATUS_PILL: Record<StockStatus, string> = {
  IN_STOCK: "bg-info-bg text-info",
  LOW_STOCK: "bg-warning-bg text-warning",
  OUT_OF_STOCK: "bg-danger-bg text-danger",
  OVER_STOCK: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
};

function computeStockStatus(qty: number, reorderPoint: number, maxStockLevel: number | null): StockStatus {
  if (qty <= 0) return "OUT_OF_STOCK";
  if (qty <= reorderPoint) return "LOW_STOCK";
  if (maxStockLevel != null && qty > maxStockLevel) return "OVER_STOCK";
  return "IN_STOCK";
}

function StockStatusPill({ status }: { status: StockStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", STOCK_STATUS_PILL[status])}>
      {STOCK_STATUS_LABEL[status]}
    </span>
  );
}

interface StockRow {
  key: string;
  product: Product;
  warehouse: Warehouse;
  qty: number;
  status: StockStatus;
  value: number;
}

const STATUS_FILTERS = ["all", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "OVER_STOCK"] as const;
type SortKey = "product" | "variant" | "warehouse" | "qty" | "reorder" | "value" | "status";

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <th className={cn("px-3 py-2.5 font-medium", align === "right" && "text-right")}>
      <button
        className={cn(
          "flex items-center gap-1 hover:text-foreground transition-colors",
          align === "right" && "ml-auto",
          active && "text-foreground",
        )}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-60" />
        )}
      </button>
    </th>
  );
}

function StockByWarehouseTab({
  products,
  warehouses,
  loading,
  onRefresh,
}: {
  products: Product[];
  warehouses: Warehouse[];
  loading: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("product");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showReorderCol, setShowReorderCol] = useState(true);
  const [showValueCol, setShowValueCol] = useState(true);

  const allRows: StockRow[] = useMemo(
    () =>
      products.flatMap((product) =>
        product.stockLevels.map((sl) => ({
          key: sl.id,
          product,
          warehouse: sl.warehouse,
          qty: sl.quantity,
          status: computeStockStatus(sl.quantity, product.reorderThreshold, product.maxStockLevel),
          value: sl.quantity * product.costPrice,
        })),
      ),
    [products],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (warehouseFilter !== "all" && row.warehouse.id !== warehouseFilter) return false;
      if (!q) return true;
      return (
        row.product.name.toLowerCase().includes(q) ||
        row.product.sku.toLowerCase().includes(q) ||
        (row.product.variantName?.toLowerCase().includes(q) ?? false) ||
        row.warehouse.name.toLowerCase().includes(q)
      );
    });
  }, [allRows, search, statusFilter, warehouseFilter]);

  const sortedRows = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      switch (sortKey) {
        case "product":
          return a.product.name.localeCompare(b.product.name) * dirMul;
        case "variant":
          return (a.product.variantName ?? "").localeCompare(b.product.variantName ?? "") * dirMul;
        case "warehouse":
          return a.warehouse.name.localeCompare(b.warehouse.name) * dirMul;
        case "qty":
          return (a.qty - b.qty) * dirMul;
        case "reorder":
          return (a.product.reorderThreshold - b.product.reorderThreshold) * dirMul;
        case "value":
          return (a.value - b.value) * dirMul;
        case "status":
          return STOCK_STATUS_LABEL[a.status].localeCompare(STOCK_STATUS_LABEL[b.status]) * dirMul;
        default:
          return 0;
      }
    });
  }, [filteredRows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  const paginatedRows = sortedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Stock Levels</h2>
          <p className="text-sm text-muted-foreground">Monitor current inventory levels across all locations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowSummary((s) => !s)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={async () => {
              await onRefresh();
              toast.success("Refreshed");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "transition-all duration-300 ease-in-out origin-top",
          showSummary
            ? "max-h-[300px] opacity-100 scale-y-100 pointer-events-auto"
            : "max-h-0 opacity-0 scale-y-95 overflow-hidden pointer-events-none",
        )}
      >
        <StockSummaryCards products={products} warehouses={warehouses} loading={loading} />
      </div>

      <Card>
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search products..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as (typeof STATUS_FILTERS)[number]);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "OVER_STOCK"] as StockStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STOCK_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={warehouseFilter}
            onValueChange={(v) => {
              setWarehouseFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : products.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No products yet.</p>
          ) : sortedRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No stock records match your filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortableHeader label="Product" sortKey="product" active={sortKey === "product"} dir={sortDir} onSort={handleSort} />
                      <SortableHeader label="Variant" sortKey="variant" active={sortKey === "variant"} dir={sortDir} onSort={handleSort} />
                      <SortableHeader
                        label="Warehouse"
                        sortKey="warehouse"
                        active={sortKey === "warehouse"}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader label="Qty" sortKey="qty" active={sortKey === "qty"} dir={sortDir} onSort={handleSort} align="right" />
                      <th className="px-3 py-2.5 font-medium">Stock Status</th>
                      {showReorderCol && (
                        <SortableHeader
                          label="Reorder Info"
                          sortKey="reorder"
                          active={sortKey === "reorder"}
                          dir={sortDir}
                          onSort={handleSort}
                        />
                      )}
                      {showValueCol && (
                        <SortableHeader
                          label="Value"
                          sortKey="value"
                          active={sortKey === "value"}
                          dir={sortDir}
                          onSort={handleSort}
                          align="right"
                        />
                      )}
                      <SortableHeader label="Status" sortKey="status" active={sortKey === "status"} dir={sortDir} onSort={handleSort} />
                      <th className="px-3 py-2.5 font-medium text-center w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setShowReorderCol((v) => !v);
                              }}
                            >
                              <Check className={cn("h-3.5 w-3.5", !showReorderCol && "opacity-0")} />
                              Reorder Info
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setShowValueCol((v) => !v);
                              }}
                            >
                              <Check className={cn("h-3.5 w-3.5", !showValueCol && "opacity-0")} />
                              Value
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={row.key} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-foreground">{row.product.name}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-primary">{row.product.variantName || "Standard"}</div>
                          <div className="text-[10px] text-muted-foreground">SKU: {row.product.sku}</div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.warehouse.name}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-medium text-foreground">{row.qty}</span>{" "}
                          <span className="text-muted-foreground">{row.product.unitOfMeasure}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <StockStatusPill status={row.status} />
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Avail: {row.qty} Res: 0 In: 0
                          </div>
                        </td>
                        {showReorderCol && (
                          <td className="px-3 py-2.5 text-muted-foreground">
                            <div>Reorder Point: {row.product.reorderThreshold}</div>
                            <div>Max Quantity: {row.product.maxStockLevel ?? "–"}</div>
                          </td>
                        )}
                        {showValueCol && (
                          <td className="px-3 py-2.5 text-right">
                            <div className="font-medium text-foreground">
                              ₹{row.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Avg Cost: ₹{row.product.costPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <StockStatusPill status={row.status} />
                        </td>
                        <td className="px-3 py-2.5" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, sortedRows.length)} of{" "}
                    {sortedRows.length} results
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select
                    value={String(rowsPerPage)}
                    onValueChange={(v) => {
                      setRowsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
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
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      «
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      ‹
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      ›
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      »
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StockMovementsTab({ products, warehouses }: { products: Product[]; warehouses: Warehouse[] }) {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState("");

  const filter: Record<string, string> = {};
  if (productId) filter.productId = productId;
  if (warehouseId) filter.warehouseId = warehouseId;
  if (type) filter.type = type;

  const { data, loading } = useQuery<{
    stockMovements: Array<{
      id: string;
      productId: string;
      productName?: string;
      type: string;
      quantity: number;
      reason: string | null;
      createdByName: string;
      createdAt: string;
      warehouse: { id: string; name: string };
    }>;
  }>(STOCK_MOVEMENTS_QUERY, { variables: { filter: Object.keys(filter).length ? filter : undefined } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock movements</CardTitle>
        <CardDescription>Every stock-affecting event across products and warehouses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SALE">Sale</SelectItem>
              <SelectItem value="PURCHASE">Purchase</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer in</SelectItem>
              <SelectItem value="TRANSFER_OUT">Transfer out</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.stockMovements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No movements match these filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Warehouse</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium text-right">Change</th>
                <th className="py-2 font-medium">Reason</th>
                <th className="py-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {data?.stockMovements.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="py-2 text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="py-2">{m.productName}</td>
                  <td className="py-2">{m.warehouse.name}</td>
                  <td className="py-2">
                    <Badge tone="info">{m.type}</Badge>
                  </td>
                  <td className={`py-2 text-right font-medium ${m.quantity >= 0 ? "text-success" : "text-danger"}`}>
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </td>
                  <td className="py-2 text-muted-foreground">{m.reason || "—"}</td>
                  <td className="py-2 text-muted-foreground">{m.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function StockAdjustmentsTab({ onNewAdjustment }: { onNewAdjustment: () => void }) {
  const { data, loading } = useQuery<{
    stockAdjustments: Array<{
      id: string;
      productName?: string;
      quantity: number;
      reason: string | null;
      createdByName: string;
      createdAt: string;
      warehouse: { id: string; name: string };
    }>;
  }>(STOCK_ADJUSTMENTS_QUERY);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock adjustments</CardTitle>
        <CardDescription>Manual corrections to stock on hand, most recent first.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.stockAdjustments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <ClipboardEdit className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No adjustments recorded yet.</p>
            <Button size="sm" onClick={onNewAdjustment}>
              <Plus className="h-4 w-4" />
              Record your first adjustment
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Warehouse</th>
                <th className="py-2 font-medium text-right">Change</th>
                <th className="py-2 font-medium">Reason</th>
                <th className="py-2 font-medium">By</th>
                <th className="py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.stockAdjustments.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="py-2">{a.productName}</td>
                  <td className="py-2">{a.warehouse.name}</td>
                  <td className={`py-2 text-right font-medium ${a.quantity >= 0 ? "text-success" : "text-danger"}`}>
                    {a.quantity > 0 ? "+" : ""}
                    {a.quantity}
                  </td>
                  <td className="py-2 text-muted-foreground">{a.reason || "—"}</td>
                  <td className="py-2 text-muted-foreground">{a.createdByName}</td>
                  <td className="py-2 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function QuickAdjustForm({
  products,
  warehouses,
  onSubmit,
  submitting,
}: {
  products: Product[];
  warehouses: Warehouse[];
  onSubmit: (productId: string, warehouseId: string, quantity: number, reason: string) => void;
  submitting: boolean;
}) {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!productId || !warehouseId || !quantity || !reason) return;
        onSubmit(productId, warehouseId, Number(quantity), reason);
      }}
    >
      <DialogHeader>
        <DialogTitle>New stock adjustment</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>Product</Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Warehouse</Label>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger>
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qa-qty">Quantity (use negative to remove)</Label>
        <Input id="qa-qty" type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qa-reason">Reason</Label>
        <Input
          id="qa-reason"
          required
          placeholder="e.g. Cycle count correction, damaged stock"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting || !productId || !warehouseId}>
          {submitting ? "Saving…" : "Apply adjustment"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function StockTransfersTab({ onNewTransfer }: { onNewTransfer: () => void }) {
  const { data, loading } = useQuery<{
    stockTransfers: Array<{
      id: string;
      productName?: string;
      quantity: number;
      reason: string | null;
      createdByName: string;
      createdAt: string;
      fromWarehouse: { id: string; name: string };
      toWarehouse: { id: string; name: string };
    }>;
  }>(STOCK_TRANSFERS_QUERY);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock transfers</CardTitle>
        <CardDescription>Movements of stock between your warehouses.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.stockTransfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No transfers recorded yet.</p>
            <Button size="sm" onClick={onNewTransfer}>
              <Plus className="h-4 w-4" />
              Record your first transfer
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">From</th>
                <th className="py-2 font-medium">To</th>
                <th className="py-2 font-medium text-right">Quantity</th>
                <th className="py-2 font-medium">Reason</th>
                <th className="py-2 font-medium">By</th>
                <th className="py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.stockTransfers.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2">{t.productName}</td>
                  <td className="py-2">{t.fromWarehouse.name}</td>
                  <td className="py-2">{t.toWarehouse.name}</td>
                  <td className="py-2 text-right font-medium">{t.quantity}</td>
                  <td className="py-2 text-muted-foreground">{t.reason || "—"}</td>
                  <td className="py-2 text-muted-foreground">{t.createdByName}</td>
                  <td className="py-2 text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function TransferForm({
  products,
  warehouses,
  onClose,
  onSaved,
}: {
  products: Product[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [transferStock] = useMutation(TRANSFER_STOCK_MUTATION);
  const [productId, setProductId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const sameWarehouse = !!fromWarehouseId && fromWarehouseId === toWarehouseId;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity || !reason || sameWarehouse) return;
    setBusy(true);
    try {
      await transferStock({
        variables: { input: { productId, fromWarehouseId, toWarehouseId, quantity: Number(quantity), reason } },
      });
      toast.success("Stock transferred");
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer stock");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>New stock transfer</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>Product</Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>From warehouse</Label>
          <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>To warehouse</Label>
          <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
            <SelectTrigger>
              <SelectValue placeholder="Destination" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {sameWarehouse && <p className="text-sm text-danger">Source and destination must be different.</p>}
      <div className="space-y-1.5">
        <Label htmlFor="tr-qty">Quantity</Label>
        <Input id="tr-qty" type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tr-reason">Reason</Label>
        <Input
          id="tr-reason"
          required
          placeholder="e.g. Rebalancing stock, fulfilling regional demand"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={busy || !productId || !fromWarehouseId || !toWarehouseId || sameWarehouse}>
          {busy ? "Transferring…" : "Transfer stock"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function LowStockTab() {
  const { data, loading } = useQuery<{
    lowStockProducts: Array<{ id: string; sku: string; name: string; totalStock: number; reorderThreshold: number }>;
  }>(LOW_STOCK_QUERY);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-danger" />
          Stock alerts
        </CardTitle>
        <CardDescription>Products at or below their reorder threshold.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.lowStockProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing is low on stock right now.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">SKU</th>
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Stock</th>
                <th className="py-2 font-medium">Threshold</th>
              </tr>
            </thead>
            <tbody>
              {data?.lowStockProducts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-mono text-xs">{p.sku}</td>
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">
                    <Badge tone="danger">{p.totalStock}</Badge>
                  </td>
                  <td className="py-2 text-muted-foreground">{p.reorderThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
