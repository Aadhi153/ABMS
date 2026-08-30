import { useMemo, useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  CheckCircle2,
  History,
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
import { BUTTON_PRESS, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";


const STATUS_FILTERS = ["all", "active", "inactive", "low"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

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
    categories {
      id
      name
    }
    brands {
      id
      name
    }
  }
`;

const STOCK_HISTORY_QUERY = gql`
  query ProductStockHistory($productId: String!) {
    productStockHistory(productId: $productId) {
      id
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

const UPDATE_PRODUCT_MUTATION = gql`
  mutation UpdateProduct($id: String!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
    }
  }
`;

export default function AllProductsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ products: Product[]; categories: Category[]; brands: Brand[] }>(
    PRODUCTS_QUERY,
  );
  const [updateProduct] = useMutation(UPDATE_PRODUCT_MUTATION);

  const [editing, setEditing] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showSummary, setShowSummary] = useState(true);
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

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    brandId: "",
    unitOfMeasure: "unit",
    costPrice: "",
    sellPrice: "",
    reorderThreshold: "0",
  });

  const categories = data?.categories ?? [];
  const brands = data?.brands ?? [];
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

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      categoryId: p.categoryId ?? "",
      brandId: p.brandId ?? "",
      unitOfMeasure: p.unitOfMeasure,
      costPrice: String(p.costPrice),
      sellPrice: String(p.sellPrice),
      reorderThreshold: String(p.reorderThreshold),
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await updateProduct({
        variables: {
          id: editing.id,
          input: {
            name: form.name,
            categoryId: form.categoryId || undefined,
            brandId: form.brandId || undefined,
            unitOfMeasure: form.unitOfMeasure,
            costPrice: Number(form.costPrice),
            sellPrice: Number(form.sellPrice),
            reorderThreshold: Number(form.reorderThreshold),
          },
        },
      });
      toast.success(`${form.name} updated`);
      setEditing(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchiveToggle(p: Product) {
    try {
      await updateProduct({ variables: { id: p.id, input: { active: !p.active } } });
      toast.success(`${p.name} ${p.active ? "archived" : "reactivated"}`);
      setDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product");
    }
  }

  return (
    <div className={cn("space-y-6", leaving ? LIST_EXIT : LIST_ENTER)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">All Products</h2>
          <p className="text-sm text-muted-foreground">Spreadsheet view for bulk editing products and variants</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
            className={cn("gap-1.5", BUTTON_PRESS)}
          >
            {showSummary ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Summary
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show Summary
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocumentsDialog(true)}
            className={cn("gap-1.5", BUTTON_PRESS)}
          >
            <FolderOpen className="h-4 w-4" />
            View Product Documents
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className={cn("gap-1.5", BUTTON_PRESS)}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
            className={cn("gap-1.5", BUTTON_PRESS)}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => goWithExit("/products/new")}
            disabled={leaving}
            className={cn("gap-1.5", BUTTON_PRESS)}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "transition-all duration-300 ease-in-out origin-top",
          showSummary
            ? "max-h-[500px] opacity-100 scale-y-100 pointer-events-auto"
            : "max-h-0 opacity-0 scale-y-95 overflow-hidden pointer-events-none !mt-0"
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-2">
          {[
            {
              label: "Total Products",
              value: stats.total,
              icon: Package,
              footer: `${stats.active} Active`,
            },
            {
              label: "Active",
              value: stats.active,
              icon: CheckCircle2,
              footer: "Live products",
            },
            {
              label: "Inactive",
              value: stats.inactive,
              icon: XCircle,
              footer: "Inactive products",
            },
            {
              label: "Low Stock",
              value: stats.low,
              icon: BarChart2,
              footer: "Items below threshold",
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="space-y-2 p-5 pt-5">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold text-foreground/80">{s.label}</span>
                  <s.icon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="text-3xl font-extrabold text-foreground">
                  {loading ? "—" : s.value}
                </div>
                <div className="text-xs text-muted-foreground">{s.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : products.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/new")} />
          ) : filteredProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No products match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="w-10 py-2 pr-2 font-medium text-right">#</th>
                    <th className="py-2 pr-4 font-medium">SKU</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Brand</th>
                    <th className="py-2 pr-4 font-medium text-right">Stock</th>
                    <th className="py-2 pr-6 font-medium text-right">Reorder At</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => {
                    const low = isLowStock(p);
                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50 animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
                        onClick={() => setDetail(p)}
                      >
                        <td className="py-1.5 pr-2 text-right text-xs text-muted-foreground">{i + 1}</td>
                        <td className="py-1.5 pr-4 font-mono text-xs">{p.sku}</td>
                        <td className="py-1.5 pr-4 font-medium">{p.name}</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{p.category?.name || "—"}</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{p.brand?.name || "—"}</td>
                        <td className="py-1.5 pr-4 text-right">{p.trackInventory ? p.totalStock : <span className="text-muted-foreground">—</span>}</td>
                        <td className="py-1.5 pr-6 text-right text-muted-foreground">{p.trackInventory ? p.reorderThreshold : "—"}</td>
                        <td className="py-1.5 pr-4">
                          {!p.active ? (
                            <Badge tone="muted">Archived</Badge>
                          ) : !p.trackInventory ? (
                            <Badge tone="info">Not tracked</Badge>
                          ) : low ? (
                            <Badge tone="danger">Low stock</Badge>
                          ) : (
                            <Badge tone="success">In stock</Badge>
                          )}
                        </td>
                        <td className="py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select value={form.brandId} onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uom">Unit of measure</Label>
              <Input id="uom" value={form.unitOfMeasure} onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost price</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sell">Sell price</Label>
              <Input
                id="sell"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.sellPrice}
                onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reorder">Reorder threshold</Label>
              <Input
                id="reorder"
                type="number"
                min="0"
                value={form.reorderThreshold}
                onChange={(e) => setForm((f) => ({ ...f, reorderThreshold: e.target.value }))}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={submitting} className={BUTTON_PRESS}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className={cn(DIALOG_CONTENT_MOTION, "max-w-lg")} overlayClassName={DIALOG_OVERLAY_MOTION}>
          {detail && (
            <ProductDetail
              product={detail}
              onArchiveToggle={() => handleArchiveToggle(detail)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Product Documents Dialog */}
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

      {/* Import Products Dialog */}
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

      {/* Export Products Dialog */}
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
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked disabled className="rounded border-border text-primary focus:ring-primary/20" />
                        SKU & Product Name
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked disabled className="rounded border-border text-primary focus:ring-primary/20" />
                        Category & Brand
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked disabled className="rounded border-border text-primary focus:ring-primary/20" />
                        Prices (Cost & Sell)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked disabled className="rounded border-border text-primary focus:ring-primary/20" />
                        Current Stock Levels
                      </label>
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

function ProductDetail({ product, onArchiveToggle }: { product: Product; onArchiveToggle: () => void }) {
  const { data } = useQuery<{
    productStockHistory: Array<{
      id: string;
      type: string;
      quantity: number;
      reason: string | null;
      createdByName: string;
      createdAt: string;
      warehouse: { id: string; name: string };
    }>;
  }>(STOCK_HISTORY_QUERY, { variables: { productId: product.id } });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">SKU</p>
          <p className="font-mono">{product.sku}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Category / Brand</p>
          <p>
            {product.category?.name || "—"} / {product.brand?.name || "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Cost / Sell price</p>
          <p>
            ${product.costPrice.toFixed(2)} / ${product.sellPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Total stock</p>
          {product.trackInventory ? (
            <p>
              {product.totalStock}{" "}
              {product.totalStock <= product.reorderThreshold && <Badge tone="danger">Low</Badge>}
            </p>
          ) : (
            <p>
              <Badge tone="info">Not tracked</Badge>
            </p>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Stock by warehouse</p>
        <table className="w-full text-sm">
          <tbody>
            {product.stockLevels.map((sl) => (
              <tr key={sl.id} className="border-b border-border last:border-0">
                <td className="py-1.5">{sl.warehouse.name}</td>
                <td className="py-1.5 text-right">{sl.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <History className="h-3.5 w-3.5" />
          Stock history
        </p>
        <div className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
          {data?.productStockHistory.length === 0 && <p className="text-muted-foreground">No movements yet.</p>}
          {data?.productStockHistory.map((h) => (
            <div key={h.id} className="flex items-center justify-between border-b border-border pb-1 last:border-0">
              <span>
                {h.quantity > 0 ? "+" : ""}
                {h.quantity} · {h.warehouse.name} · {h.reason || h.type}
              </span>
              <span className="text-muted-foreground">{h.createdByName}</span>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onArchiveToggle} className={BUTTON_PRESS}>
          {product.active ? "Archive" : "Reactivate"}
        </Button>
      </DialogFooter>
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
