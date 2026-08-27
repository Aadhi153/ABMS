import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { AlertTriangle, Boxes, ClipboardEdit, History, Package, Plus, Warehouse as WarehouseIcon } from "lucide-react";
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@abms/ui";

const TABS = [
  { key: "products", label: "Products", icon: Package },
  { key: "warehouses", label: "Warehouses", icon: WarehouseIcon },
  { key: "adjustments", label: "Stock Adjustments", icon: ClipboardEdit },
  { key: "lowstock", label: "Low Stock", icon: AlertTriangle },
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
  category: string | null;
  unitOfMeasure: string;
  costPrice: number;
  sellPrice: number;
  reorderThreshold: number;
  active: boolean;
  totalStock: number;
  stockLevels: StockLevel[];
}

const PRODUCTS_QUERY = gql`
  query Products {
    products {
      id
      sku
      name
      category
      unitOfMeasure
      costPrice
      sellPrice
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
      category
      totalStock
      reorderThreshold
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

const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
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

const ADJUST_STOCK_MUTATION = gql`
  mutation AdjustStock($input: StockAdjustmentInput!) {
    adjustStock(input: $input) {
      id
    }
  }
`;

export default function InventoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "products";

  useEffect(() => {
    if (!TABS.some((t) => t.key === segment)) {
      navigate(`/inventory/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate]);

  const { data, loading, refetch } = useQuery<{ products: Product[]; warehouses: Warehouse[] }>(PRODUCTS_QUERY);
  const [createProduct] = useMutation(CREATE_PRODUCT_MUTATION);
  const [updateProduct] = useMutation(UPDATE_PRODUCT_MUTATION);
  const [adjustStock] = useMutation(ADJUST_STOCK_MUTATION);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [adjustOpen, setAdjustOpen] = useState<Product | null>(null);
  const [quickAdjustOpen, setQuickAdjustOpen] = useState(false);

  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    unitOfMeasure: "unit",
    costPrice: "",
    sellPrice: "",
    reorderThreshold: "0",
  });
  const [adjustForm, setAdjustForm] = useState({ warehouseId: "", quantity: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const warehouses = data?.warehouses ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ sku: "", name: "", category: "", unitOfMeasure: "unit", costPrice: "", sellPrice: "", reorderThreshold: "0" });
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      category: p.category ?? "",
      unitOfMeasure: p.unitOfMeasure,
      costPrice: String(p.costPrice),
      sellPrice: String(p.sellPrice),
      reorderThreshold: String(p.reorderThreshold),
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await updateProduct({
          variables: {
            id: editing.id,
            input: {
              name: form.name,
              category: form.category || undefined,
              unitOfMeasure: form.unitOfMeasure,
              costPrice: Number(form.costPrice),
              sellPrice: Number(form.sellPrice),
              reorderThreshold: Number(form.reorderThreshold),
            },
          },
        });
        toast.success(`${form.name} updated`);
      } else {
        await createProduct({
          variables: {
            input: {
              sku: form.sku,
              name: form.name,
              category: form.category || undefined,
              unitOfMeasure: form.unitOfMeasure,
              costPrice: Number(form.costPrice),
              sellPrice: Number(form.sellPrice),
              reorderThreshold: Number(form.reorderThreshold),
            },
          },
        });
        toast.success(`${form.name} added`);
      }
      setFormOpen(false);
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

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustOpen) return;
    setSubmitting(true);
    try {
      await adjustStock({
        variables: {
          input: {
            productId: adjustOpen.id,
            warehouseId: adjustForm.warehouseId,
            quantity: Number(adjustForm.quantity),
            reason: adjustForm.reason,
          },
        },
      });
      toast.success(`Stock adjusted for ${adjustOpen.name}`);
      setAdjustOpen(null);
      setAdjustForm({ warehouseId: "", quantity: "", reason: "" });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Products, stock levels, and adjustments across warehouses.</p>
        </div>
        {tab === "adjustments" ? (
          <Button size="sm" onClick={() => setQuickAdjustOpen(true)}>
            <Plus className="h-4 w-4" />
            New Adjustment
          </Button>
        ) : (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Product
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(`/inventory/${t.key}`)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>Click a row to view stock breakdown and history.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : data?.products.length === 0 ? (
              <EmptyState label="product" onAdd={openCreate} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">SKU</th>
                    <th className="py-2 font-medium">Name</th>
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 font-medium">Stock</th>
                    <th className="py-2 font-medium">Reorder At</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.products.map((p) => {
                    const low = p.totalStock <= p.reorderThreshold;
                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                        onClick={() => setDetail(p)}
                      >
                        <td className="py-2 font-mono text-xs">{p.sku}</td>
                        <td className="py-2">{p.name}</td>
                        <td className="py-2 text-muted-foreground">{p.category || "—"}</td>
                        <td className="py-2">{p.totalStock}</td>
                        <td className="py-2 text-muted-foreground">{p.reorderThreshold}</td>
                        <td className="py-2">
                          {!p.active ? (
                            <Badge tone="muted">Archived</Badge>
                          ) : low ? (
                            <Badge tone="danger">Low stock</Badge>
                          ) : (
                            <Badge tone="success">In stock</Badge>
                          )}
                        </td>
                        <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "warehouses" && <StockByWarehouseTab products={data?.products ?? []} warehouses={warehouses} loading={loading} />}

      {tab === "adjustments" && <StockAdjustmentsTab onNewAdjustment={() => setQuickAdjustOpen(true)} />}

      {tab === "lowstock" && <LowStockTab onAdjust={(p) => setAdjustOpen(p as Product)} allProducts={data?.products ?? []} />}

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                required
                disabled={!!editing}
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
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
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail panel */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <ProductDetail
              product={detail}
              onArchiveToggle={() => handleArchiveToggle(detail)}
              onAdjust={() => {
                setAdjustOpen(detail);
                setDetail(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Stock adjustment dialog */}
      <Dialog open={!!adjustOpen} onOpenChange={(o) => !o && setAdjustOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock — {adjustOpen?.name}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAdjust}>
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select value={adjustForm.warehouseId} onValueChange={(v) => setAdjustForm((f) => ({ ...f, warehouseId: v }))}>
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
              <Label htmlFor="adj-qty">Quantity (use negative to remove)</Label>
              <Input
                id="adj-qty"
                type="number"
                required
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">Reason</Label>
              <Input
                id="adj-reason"
                required
                placeholder="e.g. Cycle count correction, damaged stock"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting || !adjustForm.warehouseId}>
                {submitting ? "Saving…" : "Apply adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick adjustment (from the Stock Adjustments tab — no product preselected) */}
      <Dialog open={quickAdjustOpen} onOpenChange={setQuickAdjustOpen}>
        <DialogContent>
          {quickAdjustOpen && (
            <QuickAdjustForm
              products={data?.products ?? []}
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
    </div>
  );
}

function ProductDetail({
  product,
  onArchiveToggle,
  onAdjust,
}: {
  product: Product;
  onArchiveToggle: () => void;
  onAdjust: () => void;
}) {
  const { data } = useQuery<{ productStockHistory: Array<{
    id: string;
    type: string;
    quantity: number;
    reason: string | null;
    createdByName: string;
    createdAt: string;
    warehouse: { id: string; name: string };
  }> }>(STOCK_HISTORY_QUERY, { variables: { productId: product.id } });

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
          <p className="text-muted-foreground">Category</p>
          <p>{product.category || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cost / Sell price</p>
          <p>
            ${product.costPrice.toFixed(2)} / ${product.sellPrice.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Total stock</p>
          <p>
            {product.totalStock}{" "}
            {product.totalStock <= product.reorderThreshold && <Badge tone="danger">Low</Badge>}
          </p>
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
        <Button variant="outline" onClick={onArchiveToggle}>
          {product.active ? "Archive" : "Reactivate"}
        </Button>
        <Button onClick={onAdjust}>Adjust stock</Button>
      </DialogFooter>
    </div>
  );
}

function StockByWarehouseTab({
  products,
  warehouses,
  loading,
}: {
  products: Product[];
  warehouses: Warehouse[];
  loading: boolean;
}) {
  const rows = useMemo(
    () =>
      products.map((p) => ({
        product: p,
        byWarehouse: Object.fromEntries(warehouses.map((w) => [w.id, p.stockLevels.find((sl) => sl.warehouse.id === w.id)?.quantity ?? 0])),
      })),
    [products, warehouses],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock by warehouse</CardTitle>
        <CardDescription>Quantity on hand for each product, broken down per warehouse.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Product</th>
                  {warehouses.map((w) => (
                    <th key={w.id} className="px-3 py-2 text-right font-medium">
                      {w.name}
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product, byWarehouse }) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="py-2">{product.name}</td>
                    {warehouses.map((w) => (
                      <td key={w.id} className="px-3 py-2 text-right">
                        {byWarehouse[w.id]}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-medium">{product.totalStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function LowStockTab({ allProducts, onAdjust }: { allProducts: Product[]; onAdjust: (p: Product) => void }) {
  const { data, loading } = useQuery<{
    lowStockProducts: Array<{ id: string; sku: string; name: string; category: string | null; totalStock: number; reorderThreshold: number }>;
  }>(LOW_STOCK_QUERY);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-danger" />
          Low stock
        </CardTitle>
        <CardDescription>Products at or below their reorder threshold.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.lowStockProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Boxes className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing is low on stock right now.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">SKU</th>
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 font-medium">Stock</th>
                <th className="py-2 font-medium">Threshold</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.lowStockProducts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-mono text-xs">{p.sku}</td>
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-muted-foreground">{p.category || "—"}</td>
                  <td className="py-2">
                    <Badge tone="danger">{p.totalStock}</Badge>
                  </td>
                  <td className="py-2 text-muted-foreground">{p.reorderThreshold}</td>
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const full = allProducts.find((ap) => ap.id === p.id);
                        if (full) onAdjust(full);
                      }}
                    >
                      Restock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Package className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No {label}s yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first {label}.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first {label}
      </Button>
    </div>
  );
}
