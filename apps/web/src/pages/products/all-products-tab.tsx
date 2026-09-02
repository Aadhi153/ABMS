import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  CheckCircle2,
  Package,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  Upload,
  Download,
  XCircle,
  BarChart2,
  ChevronsUpDown,
  MoreHorizontal,
  RotateCcw,
  Pencil,
  Archive,
  RefreshCw,
  SlidersHorizontal,
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
  Label,
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

const STATUS_FILTERS = ["all", "active", "inactive", "low"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type ActiveTab = "overview" | "analytics";

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface StockLevel {
  id: string;
  warehouse: { id: string; name: string };
  quantity: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  category: Category | null;
  brandId: string | null;
  brand: Brand | null;
  unitOfMeasure: string;
  costPrice: number;
  sellPrice: number;
  trackInventory: boolean;
  reorderThreshold: number;
  maxStockLevel: number | null;
  active: boolean;
  totalStock: number;
  stockLevels: StockLevel[];
}

const PRODUCTS_QUERY = gql`
  query AllProducts {
    products {
      id
      sku
      name
      categoryId
      category {
        id
        name
      }
      brandId
      brand {
        id
        name
      }
      unitOfMeasure
      costPrice
      sellPrice
      trackInventory
      reorderThreshold
      maxStockLevel
      active
      totalStock
      stockLevels {
        id
        quantity
        warehouse {
          id
          name
        }
      }
    }
  }
`;

const UPDATE_PRODUCT_MUTATION = gql`
  mutation UpdateProduct($id: String!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
    }
  }
`;

export default function AllProductsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ products: Product[] }>(PRODUCTS_QUERY);
  const [updateProduct] = useMutation(UPDATE_PRODUCT_MUTATION);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showSummary, setShowSummary] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog state
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "done">("idle");
  const [exportProgress, setExportProgress] = useState(0);

  const handleStartExport = () => {
    setExportStatus("exporting");
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setExportStatus("done");
          toast.success("Products exported successfully! Download started.");
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  const handleExportDialogChange = (open: boolean) => {
    setShowExportDialog(open);
    if (!open) {
      setExportStatus("idle");
      setExportProgress(0);
    }
  };

  const products = data?.products ?? [];

  function isLowStock(p: Product) {
    return p.active && p.trackInventory && p.totalStock <= p.reorderThreshold;
  }

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.active).length,
      inactive: products.filter((p) => !p.active).length,
      low: products.filter(isLowStock).length,
    }),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter === "active" && !p.active) return false;
      if (statusFilter === "inactive" && p.active) return false;
      if (statusFilter === "low" && !isLowStock(p)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category?.name.toLowerCase().includes(q) ?? false) ||
        (p.brand?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [products, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  async function handleArchiveToggle(p: Product) {
    try {
      await updateProduct({ variables: { id: p.id, input: { active: !p.active } } });
      toast.success(`${p.name} ${p.active ? "archived" : "reactivated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product");
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">All Products</h2>
          <p className="text-sm text-muted-foreground">Manage your products, variants and inventory</p>
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

          {/* More Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
                <MoreHorizontal className="h-3.5 w-3.5" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDocumentsDialog(true)}>
                <FolderOpen className="h-4 w-4" />
                View Product Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4" />
                Import Products
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                <Download className="h-4 w-4" />
                Export Products
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { refetch(); toast.success("Refreshed"); }}>
                <RotateCcw className="h-4 w-4" />
                Refresh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => goWithExit("/products/new")}
            disabled={leaving}
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out origin-top",
          showSummary
            ? "max-h-[300px] opacity-100 scale-y-100 pointer-events-auto"
            : "max-h-0 opacity-0 scale-y-95 overflow-hidden pointer-events-none !mt-0",
        )}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total Products",
              value: stats.total,
              icon: Package,
              iconClass: "text-slate-500",
              footer: `${stats.active} active`,
            },
            {
              label: "Active",
              value: stats.active,
              icon: CheckCircle2,
              iconClass: "text-emerald-500",
              footer: "Live products",
            },
            {
              label: "Inactive",
              value: stats.inactive,
              icon: XCircle,
              iconClass: "text-slate-400",
              footer: "Inactive products",
            },
            {
              label: "Low Stock",
              value: stats.low,
              icon: BarChart2,
              iconClass: "text-primary",
              footer: "Items below threshold",
            },
          ].map((s) => (
            <Card key={s.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <s.icon className={cn("h-4 w-4", s.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {loading ? "—" : s.value}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{s.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Main Content Card ── */}
      <Card>
        {/* Inner card header */}
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">All Products</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your products, variants and inventory</p>
        </div>

        {/* Search + filters bar */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter === "all" ? "all-cat" : "all-cat"}
            onValueChange={() => {}}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-cat">All Types</SelectItem>
              <SelectItem value="tracked">Tracked</SelectItem>
              <SelectItem value="untracked">Untracked</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="px-5 flex gap-0 border-b border-border">
          {(["overview", "analytics"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table area */}
        <CardContent className="p-0">
          {activeTab === "analytics" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <SlidersHorizontal className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Analytics coming soon</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Product performance charts and sales analytics will be available here.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : products.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/new")} />
          ) : filteredProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No products match your search.</p>
          ) : (
            <>
              {/* Inner sub-header inside table card */}
              <div className="px-5 py-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Product List</p>
                <p className="text-[11px] text-muted-foreground">Browse and manage all your products</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                          Product Name <ChevronsUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                          SKU <ChevronsUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 font-medium">Category</th>
                      <th className="px-4 py-2.5 font-medium">Brand</th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        <button className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                          Stock <ChevronsUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 font-medium text-right">Sell Price</th>
                      <th className="px-4 py-2.5 font-medium">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                          Status <ChevronsUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5 font-medium text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((p) => {
                      const low = isLowStock(p);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer animate-in fade-in slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none"
                          onClick={() => goWithExit(`/products/view/${p.id}`)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-foreground">{p.name}</div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">{p.sku}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.category?.name || "—"}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.brand?.name || "—"}</td>
                          <td className="px-4 py-2.5 text-right">
                            {p.trackInventory ? (
                              <span className={cn(low && "text-primary font-medium")}>{p.totalStock}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">
                            ₹{p.sellPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5">
                            {!p.active ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Inactive
                              </span>
                            ) : low ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary-bg text-primary">
                                Low Stock
                              </span>
                            ) : !p.trackInventory ? (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                Not Tracked
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => goWithExit(`/products/edit/${p.id}`)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => goWithExit(`/products/view/${p.id}`)}>
                                  <Package className="h-3.5 w-3.5" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleArchiveToggle(p)}
                                  className={p.active ? "text-danger focus:text-danger" : "text-success focus:text-success"}
                                >
                                  {p.active ? (
                                    <><Archive className="h-3.5 w-3.5" /> Archive</>
                                  ) : (
                                    <><RefreshCw className="h-3.5 w-3.5" /> Reactivate</>
                                  )}
                                </DropdownMenuItem>
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
                  <Select
                    value={String(rowsPerPage)}
                    onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
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

      {/* ── Product Documents Dialog ── */}
      <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
        <DialogContent className={cn(DIALOG_CONTENT_MOTION, "max-w-md")} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Product Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Access product specifications, manuals, and price sheets.
            </p>
            <div className="space-y-2">
              {[
                { name: "Product_Catalog_Fall_2026.pdf", size: "4.2 MB", type: "PDF" },
                { name: "Inventory_Pricing_Template.xlsx", size: "1.8 MB", type: "Spreadsheet" },
                { name: "Supplier_Quality_Agreement.docx", size: "850 KB", type: "Document" },
              ].map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type} · {doc.size}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.success(`Downloading ${doc.name}... (Demo)`)}
                    className={BUTTON_PRESS}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-muted/20">
              <Upload className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Upload new document</p>
              <p className="text-xs text-muted-foreground">PDF, XLSX, or DOCX up to 10MB</p>
              <Button
                variant="outline"
                size="sm"
                className={cn("mt-2", BUTTON_PRESS)}
                onClick={() => toast.success("Upload started... (Demo)")}
              >
                Choose File
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDocumentsDialog(false)} className={BUTTON_PRESS}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Products Dialog ── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className={cn(DIALOG_CONTENT_MOTION, "max-w-md")} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Import Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Bulk upload your products and inventory counts via CSV or Excel.
            </p>
            <div
              className="border border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => toast.success("Select CSV/XLSX file to upload... (Demo)")}
            >
              <div className="p-3 rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drag and drop file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse from computer</p>
              </div>
              <p className="text-[10px] text-muted-foreground/80 bg-muted px-2 py-0.5 rounded border border-border">
                Supported formats: .csv, .xlsx
              </p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
              <span>Need the standard template format?</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 font-medium text-primary"
                onClick={() => toast.success("Downloading import template... (Demo)")}
              >
                Download Template
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowImportDialog(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={() => toast.success("Select a file to import")} className={BUTTON_PRESS}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Export Products Dialog ── */}
      <Dialog open={showExportDialog} onOpenChange={handleExportDialogChange}>
        <DialogContent className={cn(DIALOG_CONTENT_MOTION, "max-w-md")} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Export Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {exportStatus === "idle" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose your preferences to export the current product list.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>File Format</Label>
                    <Select defaultValue="xlsx">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">Excel Spreadsheet (.xlsx)</SelectItem>
                        <SelectItem value="csv">Comma Separated Values (.csv)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-border p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground/80">Included Data</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {["SKU & Product Name", "Category & Brand", "Prices (Cost & Sell)", "Current Stock Levels"].map((col) => (
                        <label key={col} className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked readOnly className="rounded" />
                          {col}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {exportStatus === "exporting" && (
              <div className="py-6 flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-4 border-muted animate-pulse" />
                  <Download className="absolute h-5 w-5 text-primary animate-bounce" />
                </div>
                <div className="space-y-2 w-full max-w-[280px]">
                  <p className="text-sm font-semibold text-foreground">Generating Export File</p>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-primary transition-all duration-150 ease-out"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{exportProgress}% complete</p>
                </div>
              </div>
            )}
            {exportStatus === "done" && (
              <div className="py-6 flex flex-col items-center justify-center gap-3 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="h-12 w-12 rounded-full bg-success-bg text-success flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Export Ready</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your export file has been compiled and download has initiated.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("mt-2", BUTTON_PRESS)}
                  onClick={() => toast.success("Downloading file again... (Demo)")}
                >
                  Download Again
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {exportStatus === "idle" ? (
              <>
                <Button variant="outline" onClick={() => setShowExportDialog(false)} className={BUTTON_PRESS}>
                  Cancel
                </Button>
                <Button onClick={handleStartExport} className={BUTTON_PRESS}>
                  Export List
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowExportDialog(false)} className={BUTTON_PRESS}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No products yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first product.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first product
      </Button>
    </div>
  );
}
