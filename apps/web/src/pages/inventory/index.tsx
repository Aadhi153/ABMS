import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { AlertTriangle, ArrowLeftRight, ClipboardEdit, History, Plus, Warehouse as WarehouseIcon } from "lucide-react";
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
  { key: "levels", label: "Stock Levels", icon: WarehouseIcon },
  { key: "movements", label: "Stock Movements", icon: History },
  { key: "adjustments", label: "Stock Adjustments", icon: ClipboardEdit },
  { key: "alerts", label: "Stock Alerts", icon: AlertTriangle },
  { key: "transfers", label: "Stock Transfers", icon: ArrowLeftRight },
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
  totalStock: number;
  stockLevels: StockLevel[];
}

const PRODUCTS_QUERY = gql`
  query InventoryProducts {
    products {
      id
      sku
      name
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

      {tab === "levels" && <StockByWarehouseTab products={products} warehouses={warehouses} loading={loading} />}
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

function StockByWarehouseTab({
  products,
  warehouses,
  loading,
}: {
  products: Product[];
  warehouses: Warehouse[];
  loading: boolean;
}) {
  const rows = products.map((p) => ({
    product: p,
    byWarehouse: Object.fromEntries(warehouses.map((w) => [w.id, p.stockLevels.find((sl) => sl.warehouse.id === w.id)?.quantity ?? 0])),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock levels</CardTitle>
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
