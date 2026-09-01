import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Building2,
  Check,
  History,
  IndianRupee,
  Layers,
  Package,
  Pencil,
  Percent,
  Ruler,
  Tag,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
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
import { BUTTON_PRESS, CARD_HOVER, FORM_ENTER, FORM_EXIT, usePageTransition } from "./form-motion";

type DetailTab = "overview" | "variants" | "pricing";

interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  variantName: string | null;
  description: string | null;
  barcode: string | null;
  category: { id: string; name: string; color: string | null } | null;
  brand: { id: string; name: string } | null;
  taxRate: { id: string; name: string; rate: number } | null;
  unitOfMeasure: string;
  costPrice: number;
  sellPrice: number;
  trackInventory: boolean;
  reorderThreshold: number;
  active: boolean;
  totalStock: number;
  stockLevels: Array<{ id: string; quantity: number; warehouse: { id: string; name: string } }>;
}

const PRODUCT_DETAIL_QUERY = gql`
  query ProductDetail($id: String!) {
    product(id: $id) {
      id
      sku
      name
      variantName
      description
      barcode
      category {
        id
        name
        color
      }
      brand {
        id
        name
      }
      taxRate {
        id
        name
        rate
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
  }
`;

const UPDATE_PRICING_MUTATION = gql`
  mutation UpdateProductPricing($id: String!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
    }
  }
`;

const STOCK_HISTORY_QUERY = gql`
  query ProductDetailStockHistory($productId: String!) {
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

function StatusPill({ product }: { product: ProductDetail }) {
  const low = product.active && product.trackInventory && product.totalStock <= product.reorderThreshold;
  if (!product.active) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Inactive
      </span>
    );
  }
  if (low) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary-bg text-primary">
        Low Stock
      </span>
    );
  }
  if (!product.trackInventory) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
        Not Tracked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">
      Active
    </span>
  );
}

export default function ProductDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { leaving, goWithExit } = usePageTransition();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const { data, loading, refetch } = useQuery<{ product: ProductDetail | null }>(PRODUCT_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });
  const [updatePricing, { loading: savingPricing }] = useMutation(UPDATE_PRICING_MUTATION);
  const [editingPricing, setEditingPricing] = useState(false);
  const [priceForm, setPriceForm] = useState({ costPrice: "", sellPrice: "" });
  const { data: historyData } = useQuery<{
    productStockHistory: Array<{
      id: string;
      type: string;
      quantity: number;
      reason: string | null;
      createdByName: string;
      createdAt: string;
      warehouse: { id: string; name: string };
    }>;
  }>(STOCK_HISTORY_QUERY, { variables: { productId: id }, skip: !id });

  const product = data?.product;

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Package className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">Product not found</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goWithExit("/products/all")}
          className={BUTTON_PRESS}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Products
        </Button>
      </div>
    );
  }

  const margin = product.sellPrice > 0 ? ((product.sellPrice - product.costPrice) / product.sellPrice) * 100 : 0;
  const profit = product.sellPrice - product.costPrice;
  const uomLabel = product.unitOfMeasure
    ? product.unitOfMeasure.charAt(0).toUpperCase() + product.unitOfMeasure.slice(1)
    : "Each";

  function startEditPricing() {
    setPriceForm({ costPrice: String(product!.costPrice), sellPrice: String(product!.sellPrice) });
    setEditingPricing(true);
  }

  async function saveEditPricing() {
    try {
      await updatePricing({
        variables: {
          id: product!.id,
          input: { costPrice: Number(priceForm.costPrice), sellPrice: Number(priceForm.sellPrice) },
        },
      });
      toast.success("Pricing updated");
      setEditingPricing(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update pricing");
    }
  }

  return (
    <div className={cn("space-y-4", leaving ? FORM_EXIT : FORM_ENTER)}>
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goWithExit("/products/all")}
          disabled={leaving}
          className={cn("w-fit gap-1.5 px-0 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Products
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{product.name}</h1>
          <p className="text-xs text-muted-foreground">
            Product ID: {product.id} • 1 variant
          </p>
        </div>
      </div>

      {/* Product Information card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Product Information</h2>
              <p className="text-xs text-muted-foreground">Key details and specifications of this product</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Product Name</p>
                <p className="text-sm font-medium text-foreground">{product.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm text-foreground">{product.description || "No description provided"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Brand</p>
                <p className="flex items-center gap-1.5 text-sm text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {product.brand?.name || "—"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Status</p>
                <StatusPill product={product} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Category</p>
                {product.category ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Tag className="h-3 w-3" />
                    {product.category.name}
                  </span>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Tags</p>
                <p className="text-sm text-muted-foreground">No tags</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">1</p>
              <p className="text-xs text-muted-foreground">Total Variants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">₹{product.sellPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Base Price</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-around border-b border-border px-2">
          {([
            { key: "overview", label: "Overview" },
            { key: "variants", label: "Variants (1)" },
            { key: "pricing", label: "Pricing" },
          ] as { key: DetailTab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-xs font-medium transition-colors border-b-2",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Total Variants</span>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">1</div>
                <div className="mt-1 text-[11px] text-muted-foreground">Active product variants</div>
              </CardContent>
            </Card>
            <Card className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Total Stock</span>
                  <Boxes className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {product.trackInventory ? product.totalStock : "—"}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Across {product.stockLevels.length || 0} location{product.stockLevels.length === 1 ? "" : "s"}
                </div>
              </CardContent>
            </Card>
            <Card className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Average Price</span>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  ₹{product.sellPrice.toFixed(2)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">Average variant price</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Unit of Measure</h3>
                  <p className="text-xs text-muted-foreground">Units used for different operations</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Base Unit</p>
                  <p className="text-sm font-medium text-foreground">
                    {uomLabel} <span className="text-xs text-muted-foreground">({product.unitOfMeasure})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inventory Unit</p>
                  <p className="text-sm font-medium text-foreground">
                    {uomLabel} <span className="text-xs text-muted-foreground">({product.unitOfMeasure})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Purchase Unit</p>
                  <p className="text-sm font-medium text-foreground">
                    {uomLabel} <span className="text-xs text-muted-foreground">({product.unitOfMeasure})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sales Unit</p>
                  <p className="text-sm font-medium text-foreground">
                    {uomLabel} <span className="text-xs text-muted-foreground">({product.unitOfMeasure})</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Stock by Warehouse</h3>
              {product.stockLevels.length === 0 ? (
                <p className="text-xs text-muted-foreground">No stock recorded yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {product.stockLevels.map((sl) => (
                      <tr key={sl.id} className="border-b border-border last:border-0">
                        <td className="py-2 text-foreground">{sl.warehouse.name}</td>
                        <td className="py-2 text-right text-muted-foreground">{sl.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <History className="h-3.5 w-3.5" />
                Recent Stock Movements
              </h3>
              <div className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
                {historyData?.productStockHistory.length === 0 && (
                  <p className="text-muted-foreground">No movements yet.</p>
                )}
                {historyData?.productStockHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between border-b border-border pb-1.5 last:border-0"
                  >
                    <span className="text-foreground">
                      {h.quantity > 0 ? "+" : ""}
                      {h.quantity} · {h.warehouse.name} · {h.reason || h.type}
                    </span>
                    <span className="text-muted-foreground">{h.createdByName}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "variants" && (
        <Card>
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Product Variants</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each product is tracked as a single SKU/variant in this version.
            </p>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">SKU</th>
                    <th className="px-4 py-2.5 font-medium">Variant Name</th>
                    <th className="px-4 py-2.5 font-medium text-right">Price</th>
                    <th className="px-4 py-2.5 font-medium text-right">Stock</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Barcode</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{product.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {product.variantName || product.name}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">₹{product.sellPrice.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {product.trackInventory ? product.totalStock : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill product={product} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{product.barcode || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "pricing" && (
        <Card>
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Pricing Management</h3>
          </div>
          <CardContent className="p-5 space-y-5">
            <div className="space-y-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Select Variant for Pricing</h4>
                <p className="text-xs text-muted-foreground">Choose a variant to view and manage its pricing details</p>
              </div>
              <Label className="text-xs text-muted-foreground">Select Variant</Label>
              <Select value={product.id} onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={product.id}>
                    {product.variantName || product.name} ({product.sku})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-semibold text-foreground">
                Pricing Details for {product.variantName || product.name}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Price</Label>
                  {editingPricing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.sellPrice}
                      onChange={(e) => setPriceForm((f) => ({ ...f, sellPrice: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 rounded-md bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                      ₹{product.sellPrice.toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cost</Label>
                  {editingPricing ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.costPrice}
                      onChange={(e) => setPriceForm((f) => ({ ...f, costPrice: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 rounded-md bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                      ₹{product.costPrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                Price Breakdown
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <span className="font-medium text-foreground">{margin.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profit</span>
                <span className="font-medium text-foreground">₹{profit.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax Rate</span>
                <span className="font-medium text-foreground">
                  {product.taxRate ? `${product.taxRate.name} (${product.taxRate.rate}%)` : "—"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingPricing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPricing(false)}
                    disabled={savingPricing}
                    className={BUTTON_PRESS}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditPricing} disabled={savingPricing} className={BUTTON_PRESS}>
                    <Check className="h-3.5 w-3.5" />
                    {savingPricing ? "Saving…" : "Save Pricing"}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={startEditPricing} className={BUTTON_PRESS}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Pricing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
