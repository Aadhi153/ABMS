import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  AlertCircle,
  ArrowLeft,
  Factory,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Send,
  StickyNote,
  Trash2,
  Truck,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import { FormPage, useDiscardGuard } from "../products/form-page";
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";

const ORDERS_LIST_ROUTE = "/purchase/orders";

const OPTIONS_QUERY = gql`
  query NewPurchaseOrderOptions {
    suppliers {
      id
      name
      code
      email
      phone
      active
      addresses {
        id
        type
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
      }
    }
    products {
      id
      sku
      name
      costPrice
      active
    }
    warehouses {
      id
      name
      active
    }
  }
`;

const CREATE_PO = gql`
  mutation CreatePurchaseOrder($input: CreatePurchaseOrderInput!) {
    createPurchaseOrder(input: $input) {
      id
    }
  }
`;
const SEND_PO = gql`
  mutation SendPurchaseOrder($id: String!) {
    sendPurchaseOrder(id: $id) {
      id
    }
  }
`;

interface SupplierAddress {
  id: string;
  type: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
interface SupplierOption {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  addresses: SupplierAddress[];
}
interface ProductOption {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
  active: boolean;
}
interface WarehouseOption {
  id: string;
  name: string;
  active: boolean;
}

type TaxMethod = "EXCLUSIVE" | "INCLUSIVE";

interface PoItem {
  key: string;
  productId: string;
  hsnSac: string;
  quantity: number;
  uom: string;
  unitCost: number;
  discountPct: number;
  taxPct: number;
  warehouseId: string;
}

interface AddressForm {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const EMPTY_ADDRESS: AddressForm = { line1: "", line2: "", city: "", state: "", postalCode: "", country: "India" };

const UOM_OPTIONS = ["unit", "pcs", "box", "kg", "gram", "ltr", "ml", "dozen", "meter", "set"];
const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP"];
const PAYMENT_TERMS_OPTIONS = [
  { value: "DUE_ON_RECEIPT", label: "Due on Receipt" },
  { value: "NET_15", label: "Net 15" },
  { value: "NET_30", label: "Net 30" },
  { value: "NET_45", label: "Net 45" },
  { value: "NET_60", label: "Net 60" },
  { value: "CUSTOM", label: "Custom" },
];

function inr(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function computeLine(item: PoItem, taxMethod: TaxMethod) {
  const qty = item.quantity || 0;
  const cost = item.unitCost || 0;
  const gross = qty * cost;
  const taxPct = item.taxPct || 0;
  const base = taxMethod === "INCLUSIVE" ? gross / (1 + taxPct / 100) : gross;
  const discountAmt = base * ((item.discountPct || 0) / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (taxPct / 100);
  const total = afterDiscount + taxAmt;
  return { base, discountAmt, taxAmt, total };
}

let itemSeq = 0;
function newItem(): PoItem {
  itemSeq += 1;
  return {
    key: `item-${itemSeq}`,
    productId: "",
    hsnSac: "",
    quantity: 1,
    uom: "unit",
    unitCost: 0,
    discountPct: 0,
    taxPct: 0,
    warehouseId: "",
  };
}

function addressToInput(a: AddressForm) {
  if (!a.line1 && !a.line2 && !a.city && !a.state && !a.postalCode) return undefined;
  return { line1: a.line1 || undefined, line2: a.line2 || undefined, city: a.city || undefined, state: a.state || undefined, postalCode: a.postalCode || undefined, country: a.country || undefined };
}

export default function NewPurchaseOrderPage() {
  const { data, loading: optionsLoading, error: optionsError } = useQuery<{
    suppliers: SupplierOption[];
    products: ProductOption[];
    warehouses: WarehouseOption[];
  }>(OPTIONS_QUERY);
  const [createPo] = useMutation(CREATE_PO, { refetchQueries: ["PurchasePageData"] });
  const [sendPo] = useMutation(SEND_PO, { refetchQueries: ["PurchasePageData"] });

  const suppliers = (data?.suppliers ?? []).filter((s) => s.active !== false);
  const products = (data?.products ?? []).filter((p) => p.active !== false);
  const warehouses = data?.warehouses ?? [];

  const [items, setItems] = useState<PoItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");

  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [paymentTerms, setPaymentTerms] = useState("NET_30");

  const [taxMethod, setTaxMethod] = useState<TaxMethod>("EXCLUSIVE");
  const [shippingAmount, setShippingAmount] = useState("");

  const [supplierNotes, setSupplierNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [supplierAddress, setSupplierAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [deliveryAddress, setDeliveryAddress] = useState<AddressForm>(EMPTY_ADDRESS);

  const [busy, setBusy] = useState<"idle" | "draft" | "send">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const dirty =
    !!supplierId || items.length > 0 || !!supplierNotes || !!terms || !!internalNotes || !!trackingCode;
  const { goBack, leaving, exitTo, discardDialog } = useDiscardGuard(ORDERS_LIST_ROUTE, dirty);

  const totals = useMemo(() => {
    const lines = items.map((it) => computeLine(it, taxMethod));
    const subtotal = lines.reduce((sum, l) => sum + l.base, 0);
    const discountAmount = lines.reduce((sum, l) => sum + l.discountAmt, 0);
    const tax = lines.reduce((sum, l) => sum + l.taxAmt, 0);
    const shipping = Number(shippingAmount) || 0;
    const total = subtotal - discountAmount + tax + shipping;
    return { subtotal, discountAmount, tax, shipping, total };
  }, [items, taxMethod, shippingAmount]);

  const gstRegion =
    supplierAddress.state && deliveryAddress.state
      ? supplierAddress.state.trim().toLowerCase() === deliveryAddress.state.trim().toLowerCase()
        ? "INTRA-STATE"
        : "INTER-STATE"
      : null;

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }
  function updateItem(key: string, patch: Partial<PoItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function pickProduct(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateItem(key, { productId, unitCost: product?.costPrice ?? 0 });
  }

  function selectSupplier(s: SupplierOption) {
    setSupplierId(s.id);
    setSupplierPickerOpen(false);
    setSupplierSearch("");
    const addr = s.addresses[0];
    if (addr) {
      setSupplierAddress({
        line1: addr.addressLine1,
        line2: addr.addressLine2 ?? "",
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
      });
    }
  }

  function copySupplierAddress() {
    setDeliveryAddress(supplierAddress);
  }

  function buildInput() {
    return {
      supplierId,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      trackingCode: trackingCode || undefined,
      currency,
      paymentTerms: paymentTerms || undefined,
      taxMethod,
      supplierNotes: supplierNotes || undefined,
      termsConditions: terms || undefined,
      internalNotes: internalNotes || undefined,
      shippingAmount: Number(shippingAmount) || 0,
      supplierAddress: addressToInput(supplierAddress),
      deliveryAddress: addressToInput(deliveryAddress),
      items: items.map((it) => ({
        productId: it.productId,
        hsnSac: it.hsnSac || undefined,
        quantity: it.quantity,
        uom: it.uom,
        unitCost: it.unitCost,
        discountPct: it.discountPct,
        taxPct: it.taxPct,
        warehouseId: it.warehouseId || undefined,
      })),
    };
  }

  function validate() {
    if (!supplierId) {
      setSubmitError("Select a supplier");
      return false;
    }
    if (items.length === 0 || items.some((it) => !it.productId)) {
      setSubmitError("Add at least one item with a product selected");
      return false;
    }
    return true;
  }

  async function handleSaveDraft() {
    if (!validate()) return;
    setSubmitError(null);
    setBusy("draft");
    try {
      await createPo({ variables: { input: buildInput() } });
      toast.success("Purchase order saved as a draft");
      holdSuccessThen(() => exitTo(ORDERS_LIST_ROUTE));
    } catch (err) {
      setBusy("idle");
      const message = err instanceof Error ? err.message : "Failed to save purchase order";
      setSubmitError(message);
      toast.error(message);
    }
  }

  async function handleSendOrder() {
    if (!validate()) return;
    setSubmitError(null);
    setBusy("send");
    try {
      const res = await createPo({ variables: { input: buildInput() } });
      const id = res.data?.createPurchaseOrder?.id;
      if (id) await sendPo({ variables: { id } });
      toast.success("Purchase order sent");
      holdSuccessThen(() => exitTo(ORDERS_LIST_ROUTE));
    } catch (err) {
      setBusy("idle");
      const message = err instanceof Error ? err.message : "Failed to send purchase order";
      setSubmitError(message);
      toast.error(message);
    }
  }

  const filteredSuppliers = suppliers.filter((s) => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q);
  });

  return (
    <FormPage leaving={leaving}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goBack}
              className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">New Purchase Order</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage and track your procurement documentation</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Save as draft"
              disabled={busy !== "idle" || leaving}
              onClick={handleSaveDraft}
              className={BUTTON_PRESS}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button type="button" disabled={busy !== "idle" || leaving} onClick={handleSendOrder} className={BUTTON_PRESS}>
              <Send className="h-4 w-4" />
              {busy === "send" ? "Sending…" : "Send to Supplier"}
            </Button>
          </div>
        </div>

        {submitError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
            {submitError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2.5">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Order Items</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="min-w-[180px] py-1.5 font-medium">Product</th>
                        <th className="min-w-[90px] py-1.5 font-medium">HSN/SAC</th>
                        <th className="min-w-[64px] py-1.5 font-medium">Qty</th>
                        <th className="min-w-[84px] py-1.5 font-medium">UOM</th>
                        <th className="min-w-[96px] py-1.5 font-medium">Unit Price</th>
                        <th className="min-w-[80px] py-1.5 font-medium">Disc %</th>
                        <th className="min-w-[72px] py-1.5 font-medium">Tax %</th>
                        <th className="min-w-[140px] py-1.5 font-medium">Warehouse</th>
                        <th className="min-w-[96px] py-1.5 text-right font-medium">Total</th>
                        <th className="w-8 py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                            No items added yet. Click &ldquo;Add Item&rdquo; below to start.
                          </td>
                        </tr>
                      ) : (
                        items.map((it) => {
                          const line = computeLine(it, taxMethod);
                          return (
                            <tr key={it.key} className="border-b border-border last:border-0">
                              <td className="py-1 pr-2">
                                <Select value={it.productId} onValueChange={(v) => pickProduct(it.key, v)}>
                                  <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-1 pr-2">
                                <Input value={it.hsnSac} onChange={(e) => updateItem(it.key, { hsnSac: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={it.quantity}
                                  onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) })}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Select value={it.uom} onValueChange={(v) => updateItem(it.key, { uom: v })}>
                                  <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UOM_OPTIONS.map((u) => (
                                      <SelectItem key={u} value={u}>
                                        {u}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={it.unitCost}
                                  onChange={(e) => updateItem(it.key, { unitCost: Number(e.target.value) })}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={it.discountPct}
                                  onChange={(e) => updateItem(it.key, { discountPct: Number(e.target.value) })}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={it.taxPct}
                                  onChange={(e) => updateItem(it.key, { taxPct: Number(e.target.value) })}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Select value={it.warehouseId} onValueChange={(v) => updateItem(it.key, { warehouseId: v })}>
                                  <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                                    <SelectValue placeholder="Warehouse" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {warehouses.map((w) => (
                                      <SelectItem key={w.id} value={w.id}>
                                        {w.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-1 text-right font-medium">{inr(line.total)}</td>
                              <td className="py-1 text-right">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(it.key)}>
                                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <Button type="button" variant="ghost" size="sm" onClick={addItem} className={cn("gap-1.5 px-2 text-primary hover:bg-primary/5 hover:text-primary", BUTTON_PRESS)}>
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {items.length} item{items.length === 1 ? "" : "s"} added
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 p-4 pb-2.5">
                <StickyNote className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Notes &amp; Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="space-y-1">
                  <Label>Notes for Supplier</Label>
                  <p className="text-xs text-muted-foreground">These notes will be visible on the document</p>
                  <Textarea value={supplierNotes} onChange={(e) => setSupplierNotes(e.target.value)} placeholder="Add any notes for the supplier…" className={cn("min-h-[64px]", FOCUS_GLOW)} />
                </div>
                <div className="space-y-1">
                  <Label>Internal Notes</Label>
                  <p className="text-xs text-muted-foreground">These notes are for internal use only (not visible to supplier)</p>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add internal notes…"
                    className={cn("min-h-[64px] border-warning/30 bg-warning-bg/40 placeholder:text-warning/70", FOCUS_GLOW)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Terms &amp; Conditions</Label>
                  <p className="text-xs text-muted-foreground">Standard terms that apply to this document</p>
                  <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Enter terms and conditions…" className={cn("min-h-[64px]", FOCUS_GLOW)} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2.5">
                  <CardTitle className="text-sm">Supplier Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <AddressFields value={supplierAddress} onChange={setSupplierAddress} idPrefix="supplier" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2.5">
                  <CardTitle className="text-sm">Delivery Address</CardTitle>
                  <Button type="button" variant="link" size="sm" onClick={copySupplierAddress} className="h-auto p-0 text-xs">
                    Copy Supplier
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <AddressFields value={deliveryAddress} onChange={setDeliveryAddress} idPrefix="delivery" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Supplier Context</CardTitle>
                </div>
                <Button type="button" variant="link" size="sm" onClick={() => setSupplierPickerOpen(true)} className="h-auto p-0 text-xs">
                  Select
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">Selected Partner</p>
                <p className={cn("mt-0.5 text-sm font-medium", !selectedSupplier && "text-muted-foreground")}>
                  {selectedSupplier ? selectedSupplier.name : "No supplier selected"}
                </p>
                {selectedSupplier?.email && <p className="mt-1 text-xs text-muted-foreground">{selectedSupplier.email}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Expected Date</Label>
                  <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tracking Code</Label>
                  <Input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="-" className={cn("h-8 text-xs", FOCUS_GLOW)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5 rounded-lg border border-border p-2.5">
                  <p className="text-xs font-medium text-foreground">Tax Method</p>
                  {(
                    [
                      { value: "EXCLUSIVE", label: "Exclusive", hint: "Tax added on top" },
                      { value: "INCLUSIVE", label: "Inclusive", hint: "Tax included in price" },
                    ] as const
                  ).map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted">
                      <input
                        type="radio"
                        name="taxMethod"
                        value={opt.value}
                        checked={taxMethod === opt.value}
                        onChange={() => setTaxMethod(opt.value)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      <span className="text-foreground">
                        {opt.label} <span className="text-muted-foreground">({opt.hint})</span>
                      </span>
                    </label>
                  ))}
                </div>

                {gstRegion && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      gstRegion === "INTRA-STATE" ? "bg-info-bg text-info" : "bg-warning-bg text-warning",
                    )}
                  >
                    {gstRegion}
                  </span>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{inr(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount Amount</span>
                    <span className="text-danger">{inr(totals.discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{inr(totals.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="shrink-0 text-muted-foreground">Shipping Amount</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingAmount}
                      onChange={(e) => setShippingAmount(e.target.value)}
                      placeholder="0.00"
                      className={cn("h-7 w-24 text-right text-xs", FOCUS_GLOW)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold">Total Amount</span>
                  <span className="text-lg font-bold text-primary">{inr(totals.total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={supplierPickerOpen} onOpenChange={setSupplierPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-4.5 w-4.5 text-muted-foreground" />
              Search Supplier
            </DialogTitle>
          </DialogHeader>
          <div className="relative pt-4">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} placeholder="Search by name, code, or email" className={cn("pl-8", FOCUS_GLOW)} />
          </div>
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
            {optionsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                Loading suppliers…
              </div>
            ) : optionsError ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-danger">
                <AlertCircle className="h-5 w-5" />
                Couldn&rsquo;t load suppliers. Please try again.
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Factory className="h-5 w-5" />
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">No suppliers found</p>
                <p className="text-xs text-muted-foreground">{supplierSearch.trim() ? "Try a different search term." : "You haven't added any suppliers yet."}</p>
                {!supplierSearch.trim() && (
                  <a href="/suppliers/new" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <UserPlus className="h-3.5 w-3.5" />
                    Add a supplier
                  </a>
                )}
              </div>
            ) : (
              filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSupplier(s)}
                  className={cn("flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted", s.id === supplierId && "bg-primary/5")}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Truck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{s.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.code}
                      {s.email ? ` · ${s.email}` : ""}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {discardDialog}
    </FormPage>
  );
}

function AddressFields({ value, onChange, idPrefix }: { value: AddressForm; onChange: (v: AddressForm) => void; idPrefix: string }) {
  function set(patch: Partial<AddressForm>) {
    onChange({ ...value, ...patch });
  }
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-line1`} className="text-xs text-muted-foreground">
          Address Line 1
        </Label>
        <Input id={`${idPrefix}-line1`} value={value.line1} onChange={(e) => set({ line1: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-line2`} className="text-xs text-muted-foreground">
          Address Line 2
        </Label>
        <Input id={`${idPrefix}-line2`} value={value.line2} onChange={(e) => set({ line2: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">City</Label>
          <Input value={value.city} onChange={(e) => set({ city: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">State</Label>
          <Input value={value.state} onChange={(e) => set({ state: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Postal Code</Label>
          <Input value={value.postalCode} onChange={(e) => set({ postalCode: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Country</Label>
          <Input value={value.country} onChange={(e) => set({ country: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
        </div>
      </div>
    </>
  );
}
