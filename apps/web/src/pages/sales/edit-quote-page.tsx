import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  ArrowLeft,
  Building2,
  Lock,
  Package,
  Plus,
  Save,
  Search,
  Send,
  StickyNote,
  Trash2,
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
  StatusBadge,
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import { FormPage, FormScrollArea, useDiscardGuard } from "../products/form-page";
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";

const QUOTES_LIST_ROUTE = "/sales/quotes";

const EDIT_QUOTE_QUERY = gql`
  query EditQuoteData($id: String!) {
    quote(id: $id) {
      id
      quoteNumber
      status
      customerId
      validUntil
      reference
      paymentTerms
      priceListId
      taxMethod
      customerNotes
      termsConditions
      internalNotes
      shippingAmount
      items {
        id
        productId
        hsnSac
        quantity
        uom
        unitPrice
        discountPct
        taxPct
        warehouseId
      }
    }
    customers {
      id
      name
      code
      email
      phone
      active
    }
    products {
      id
      sku
      name
      sellPrice
      totalStock
      active
    }
    warehouses {
      id
      name
      active
    }
    priceLists {
      id
      name
      active
    }
  }
`;

const UPDATE_QUOTE = gql`
  mutation UpdateQuote($id: String!, $input: CreateQuoteInput!) {
    updateQuote(id: $id, input: $input) {
      id
    }
  }
`;
const SEND_QUOTE = gql`
  mutation SendQuote($id: String!) {
    sendQuote(id: $id) {
      id
    }
  }
`;

interface CustomerOption {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
}
interface ProductOption {
  id: string;
  sku: string;
  name: string;
  sellPrice: number;
  totalStock: number;
  active: boolean;
}
interface WarehouseOption {
  id: string;
  name: string;
  active: boolean;
}
interface PriceListOption {
  id: string;
  name: string;
  active: boolean;
}

type TaxMethod = "EXCLUSIVE" | "INCLUSIVE";

interface QuoteItem {
  key: string;
  productId: string;
  hsnSac: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  warehouseId: string;
}

interface ServerQuote {
  id: string;
  quoteNumber: string;
  status: string;
  customerId: string;
  validUntil: string | null;
  reference: string | null;
  paymentTerms: string | null;
  priceListId: string | null;
  taxMethod: string;
  customerNotes: string | null;
  termsConditions: string | null;
  internalNotes: string | null;
  shippingAmount: number;
  items: Array<{
    id: string;
    productId: string;
    hsnSac: string | null;
    quantity: number;
    uom: string;
    unitPrice: number;
    discountPct: number;
    taxPct: number;
    warehouseId: string | null;
  }>;
}

const UOM_OPTIONS = ["unit", "pcs", "box", "kg", "gram", "ltr", "ml", "dozen", "meter", "set"];

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

function computeLine(item: QuoteItem, taxMethod: TaxMethod) {
  const qty = item.quantity || 0;
  const price = item.unitPrice || 0;
  const gross = qty * price;
  const taxPct = item.taxPct || 0;
  const base = taxMethod === "INCLUSIVE" ? gross / (1 + taxPct / 100) : gross;
  const discountAmt = base * ((item.discountPct || 0) / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (taxPct / 100);
  const total = afterDiscount + taxAmt;
  return { base, discountAmt, taxAmt, total };
}

let itemSeq = 0;
function newItem(): QuoteItem {
  itemSeq += 1;
  return {
    key: `item-${itemSeq}`,
    productId: "",
    hsnSac: "",
    quantity: 1,
    uom: "unit",
    unitPrice: 0,
    discountPct: 0,
    taxPct: 0,
    warehouseId: "",
  };
}

function hydrateItem(i: ServerQuote["items"][number]): QuoteItem {
  itemSeq += 1;
  return {
    key: `item-${itemSeq}`,
    productId: i.productId,
    hsnSac: i.hsnSac ?? "",
    quantity: i.quantity,
    uom: i.uom,
    unitPrice: i.unitPrice,
    discountPct: i.discountPct,
    taxPct: i.taxPct,
    warehouseId: i.warehouseId ?? "",
  };
}

function toDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{
    quote: ServerQuote | null;
    customers: CustomerOption[];
    products: ProductOption[];
    warehouses: WarehouseOption[];
    priceLists: PriceListOption[];
  }>(EDIT_QUOTE_QUERY, { variables: { id }, skip: !id });
  const [updateQuote] = useMutation(UPDATE_QUOTE, { refetchQueries: ["QuotesPageData"] });
  const [sendQuote] = useMutation(SEND_QUOTE, { refetchQueries: ["QuotesPageData"] });

  const customers = (data?.customers ?? []).filter((c) => c.active !== false);
  const products = (data?.products ?? []).filter((p) => p.active !== false);
  const warehouses = data?.warehouses ?? [];
  const priceLists = (data?.priceLists ?? []).filter((p) => p.active !== false);

  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<string>("DRAFT");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const [validUntil, setValidUntil] = useState("");
  const [reference, setReference] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("NET_30");
  const [priceListId, setPriceListId] = useState("");

  const [taxMethod, setTaxMethod] = useState<TaxMethod>("EXCLUSIVE");
  const [shippingAmount, setShippingAmount] = useState("");

  const [customerNotes, setCustomerNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [busy, setBusy] = useState<"idle" | "draft" | "send">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (data?.quote && !hydrated) {
      const q = data.quote;
      const hydratedValidUntil = toDateInput(q.validUntil);
      const hydratedShipping = q.shippingAmount ? String(q.shippingAmount) : "";
      setStatus(q.status);
      setCustomerId(q.customerId);
      setValidUntil(hydratedValidUntil);
      setReference(q.reference ?? "");
      setPaymentTerms(q.paymentTerms ?? "NET_30");
      setPriceListId(q.priceListId ?? "");
      setTaxMethod((q.taxMethod as TaxMethod) ?? "EXCLUSIVE");
      setShippingAmount(hydratedShipping);
      setCustomerNotes(q.customerNotes ?? "");
      setTerms(q.termsConditions ?? "");
      setInternalNotes(q.internalNotes ?? "");
      setItems(q.items.map(hydrateItem));
      setInitialSnapshot(
        JSON.stringify({
          customerId: q.customerId,
          validUntil: hydratedValidUntil,
          reference: q.reference ?? "",
          paymentTerms: q.paymentTerms ?? "NET_30",
          priceListId: q.priceListId ?? "",
          taxMethod: q.taxMethod ?? "EXCLUSIVE",
          shippingAmount: hydratedShipping,
          customerNotes: q.customerNotes ?? "",
          terms: q.termsConditions ?? "",
          internalNotes: q.internalNotes ?? "",
          items: q.items.map((i) => ({
            productId: i.productId,
            hsnSac: i.hsnSac ?? "",
            quantity: i.quantity,
            uom: i.uom,
            unitPrice: i.unitPrice,
            discountPct: i.discountPct,
            taxPct: i.taxPct,
            warehouseId: i.warehouseId ?? "",
          })),
        }),
      );
      setHydrated(true);
    }
  }, [data, hydrated]);

  const readOnly = hydrated && status !== "DRAFT";

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const currentSnapshot = JSON.stringify({
    customerId,
    validUntil,
    reference,
    paymentTerms,
    priceListId,
    taxMethod,
    shippingAmount,
    customerNotes,
    terms,
    internalNotes,
    items: items.map(({ key: _key, ...rest }) => rest),
  });
  const dirty = hydrated && !readOnly && initialSnapshot !== null && currentSnapshot !== initialSnapshot;

  const { goBack, leaving, exitTo, discardDialog } = useDiscardGuard(QUOTES_LIST_ROUTE, dirty);

  const totals = useMemo(() => {
    const lines = items.map((it) => computeLine(it, taxMethod));
    const subtotal = lines.reduce((sum, l) => sum + l.base, 0);
    const discountAmount = lines.reduce((sum, l) => sum + l.discountAmt, 0);
    const tax = lines.reduce((sum, l) => sum + l.taxAmt, 0);
    const shipping = Number(shippingAmount) || 0;
    const total = subtotal - discountAmount + tax + shipping;
    return { subtotal, discountAmount, tax, shipping, total };
  }, [items, taxMethod, shippingAmount]);

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function updateItem(key: string, patch: Partial<QuoteItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function pickProduct(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateItem(key, { productId, unitPrice: product?.sellPrice ?? 0 });
  }

  function buildInput() {
    return {
      customerId,
      validUntil: validUntil || undefined,
      reference: reference || undefined,
      paymentTerms: paymentTerms || undefined,
      priceListId: priceListId || undefined,
      taxMethod,
      customerNotes: customerNotes || undefined,
      termsConditions: terms || undefined,
      internalNotes: internalNotes || undefined,
      shippingAmount: Number(shippingAmount) || 0,
      items: items.map((it) => ({
        productId: it.productId,
        hsnSac: it.hsnSac || undefined,
        quantity: it.quantity,
        uom: it.uom,
        unitPrice: it.unitPrice,
        discountPct: it.discountPct,
        taxPct: it.taxPct,
        warehouseId: it.warehouseId || undefined,
      })),
    };
  }

  async function handleSave() {
    if (!id) return;
    if (!customerId) {
      setSubmitError("Select a customer");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.productId)) {
      setSubmitError("Add at least one item with a product selected");
      return;
    }
    setSubmitError(null);
    setBusy("draft");
    try {
      await updateQuote({ variables: { id, input: buildInput() } });
      toast.success("Quote updated");
      holdSuccessThen(() => exitTo(QUOTES_LIST_ROUTE));
    } catch (err) {
      setBusy("idle");
      const message = err instanceof Error ? err.message : "Failed to update quote";
      setSubmitError(message);
      toast.error(message);
    }
  }

  async function handleUpdateAndSend() {
    if (!id) return;
    if (!customerId) {
      setSubmitError("Select a customer");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.productId)) {
      setSubmitError("Add at least one item with a product selected");
      return;
    }
    setSubmitError(null);
    setBusy("send");
    try {
      await updateQuote({ variables: { id, input: buildInput() } });
      await sendQuote({ variables: { id } });
      toast.success("Quote sent");
      holdSuccessThen(() => exitTo(QUOTES_LIST_ROUTE));
    } catch (err) {
      setBusy("idle");
      const message = err instanceof Error ? err.message : "Failed to send quote";
      setSubmitError(message);
      toast.error(message);
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  if (loading && !hydrated) {
    return (
      <FormPage>
        <FormScrollArea>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!loading && !data?.quote) {
    return (
      <FormPage>
        <FormScrollArea>
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
          <h1 className="text-2xl font-bold tracking-tight">Quote not found</h1>
        </FormScrollArea>
      </FormPage>
    );
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {readOnly ? "View Quote" : "Edit Quote"} {data?.quote ? `· ${data.quote.quoteNumber}` : ""}
              </h1>
              {hydrated && <StatusBadge status={status} />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {readOnly
                ? "This quote has already been sent and can no longer be edited."
                : "Update the quote details for your customer"}
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Save changes"
                disabled={busy !== "idle" || leaving}
                onClick={handleSave}
                className={BUTTON_PRESS}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                disabled={busy !== "idle" || leaving}
                onClick={handleUpdateAndSend}
                className={BUTTON_PRESS}
              >
                <Send className="h-4 w-4" />
                {busy === "send" ? "Sending…" : "Save & Send Quote"}
              </Button>
            </div>
          )}
        </div>

        {readOnly && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            Quotes can only be edited while they're still a draft.
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger"
          >
            {submitError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Quote Items</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="min-w-[180px] py-2 font-medium">Product</th>
                        <th className="min-w-[90px] py-2 font-medium">HSN/SAC</th>
                        <th className="min-w-[64px] py-2 font-medium">Qty</th>
                        <th className="min-w-[84px] py-2 font-medium">UOM</th>
                        <th className="min-w-[96px] py-2 font-medium">Unit Price</th>
                        <th className="min-w-[80px] py-2 font-medium">Discount</th>
                        <th className="min-w-[72px] py-2 font-medium">Tax %</th>
                        <th className="min-w-[140px] py-2 font-medium">Warehouse</th>
                        <th className="min-w-[96px] py-2 text-right font-medium">Total</th>
                        {!readOnly && <th className="w-8 py-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                            No items added yet. Click &ldquo;Add Another Item&rdquo; below to start.
                          </td>
                        </tr>
                      ) : (
                        items.map((it) => {
                          const line = computeLine(it, taxMethod);
                          return (
                            <tr key={it.key} className="border-b border-border last:border-0">
                              <td className="py-1.5 pr-2">
                                <Select
                                  value={it.productId}
                                  onValueChange={(v) => pickProduct(it.key, v)}
                                  disabled={readOnly}
                                >
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
                              <td className="py-1.5 pr-2">
                                <Input
                                  value={it.hsnSac}
                                  onChange={(e) => updateItem(it.key, { hsnSac: e.target.value })}
                                  disabled={readOnly}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={it.quantity}
                                  onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) })}
                                  disabled={readOnly}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <Select value={it.uom} onValueChange={(v) => updateItem(it.key, { uom: v })} disabled={readOnly}>
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
                              <td className="py-1.5 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={it.unitPrice}
                                  onChange={(e) => updateItem(it.key, { unitPrice: Number(e.target.value) })}
                                  disabled={readOnly}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={it.discountPct}
                                  onChange={(e) => updateItem(it.key, { discountPct: Number(e.target.value) })}
                                  disabled={readOnly}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={it.taxPct}
                                  onChange={(e) => updateItem(it.key, { taxPct: Number(e.target.value) })}
                                  disabled={readOnly}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1.5 pr-2">
                                <Select
                                  value={it.warehouseId}
                                  onValueChange={(v) => updateItem(it.key, { warehouseId: v })}
                                  disabled={readOnly}
                                >
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
                              <td className="py-1.5 text-right font-medium">{inr(line.total)}</td>
                              {!readOnly && (
                                <td className="py-1.5 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => removeItem(it.key)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addItem}
                      className={cn("gap-1.5 px-2 text-primary hover:bg-primary/5 hover:text-primary", BUTTON_PRESS)}
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Item
                    </Button>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {items.length} item{items.length === 1 ? "" : "s"} added
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
                <StickyNote className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Notes &amp; Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                  <Label>Customer Notes</Label>
                  <p className="text-xs text-muted-foreground">Notes visible to customer</p>
                  <Textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Enter any notes that will be visible to the customer on the quote…"
                    disabled={readOnly}
                    className={FOCUS_GLOW}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Terms &amp; Conditions</Label>
                  <p className="text-xs text-muted-foreground">Visible to customer</p>
                  <Textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Payment is due within 30 days of quote acceptance…"
                    disabled={readOnly}
                    className={FOCUS_GLOW}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Internal Notes</Label>
                  <p className="text-xs text-muted-foreground">Only visible to your team</p>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add internal notes for your team…"
                    disabled={readOnly}
                    className={cn("border-warning/30 bg-warning-bg/40 placeholder:text-warning/70", FOCUS_GLOW)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Customer Info</CardTitle>
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setCustomerPickerOpen(true)}
                    className="h-auto p-0 text-xs"
                  >
                    Select
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">Company</p>
                <p className={cn("mt-0.5 text-sm font-medium", !selectedCustomer && "text-muted-foreground")}>
                  {selectedCustomer ? selectedCustomer.name : "No customer selected"}
                </p>
                {selectedCustomer?.email && (
                  <p className="mt-1 text-xs text-muted-foreground">{selectedCustomer.email}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Status Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <StatusBadge status={status} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valid Until</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    disabled={readOnly}
                    className={cn("h-8 text-xs", FOCUS_GLOW)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Reference</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="-"
                    disabled={readOnly}
                    className={cn("h-8 text-xs", FOCUS_GLOW)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms} disabled={readOnly}>
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
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Price List</Label>
                  <Select value={priceListId} onValueChange={setPriceListId} disabled={readOnly}>
                    <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                      <SelectValue placeholder="Standard prices" />
                    </SelectTrigger>
                    <SelectContent>
                      {priceLists.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <label
                      key={opt.value}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted",
                        readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                      )}
                    >
                      <input
                        type="radio"
                        name="taxMethod"
                        value={opt.value}
                        checked={taxMethod === opt.value}
                        onChange={() => setTaxMethod(opt.value)}
                        disabled={readOnly}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      <span className="text-foreground">
                        {opt.label} <span className="text-muted-foreground">({opt.hint})</span>
                      </span>
                    </label>
                  ))}
                </div>

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
                      disabled={readOnly}
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
      </FormScrollArea>

      <Dialog open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select customer</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name, code, or email"
              className={cn("pl-8", FOCUS_GLOW)}
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No customers found.</p>
            ) : (
              filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCustomerId(c.id);
                    setCustomerPickerOpen(false);
                    setCustomerSearch("");
                  }}
                  className={cn(
                    "flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    c.id === customerId && "bg-primary/5",
                  )}
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.code}
                    {c.email ? ` · ${c.email}` : ""}
                  </span>
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
