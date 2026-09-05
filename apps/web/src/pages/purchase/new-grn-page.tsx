import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { AlertCircle, ArrowLeft, Factory, Landmark, Loader2, PackageCheck, Save, StickyNote, Truck, Wallet } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { inr } from "./purchase-helpers";
import type { PurchaseOrder, Warehouse, BankAccountOption } from "./types";

const ORDERS_LIST_ROUTE = "/purchase/orders";

const OPTIONS_QUERY = gql`
  query NewGrnOptions($poId: String!) {
    purchaseOrder(id: $poId) {
      id
      poNumber
      status
      supplierId
      supplierName
      taxMethod
      supplierAddress { line1 line2 city state postalCode country }
      deliveryAddress { line1 line2 city state postalCode country }
      items {
        id
        productId
        productName
        sku
        hsnSac
        quantity
        uom
        unitCost
        receivedQuantity
      }
    }
    warehouses {
      id
      name
      active
    }
    bankAccounts {
      id
      name
      bankName
      accountNumber
    }
  }
`;

const CREATE_GRN = gql`
  mutation CreateGrn($input: CreateGrnInput!) {
    createGrn(input: $input) {
      id
    }
  }
`;

type TaxMethod = "EXCLUSIVE" | "INCLUSIVE";

interface GrnLine {
  key: string;
  purchaseOrderItemId: string;
  productName: string;
  sku: string;
  hsnSac: string;
  uom: string;
  orderedQty: number;
  outstandingQty: number;
  quantityReceived: number;
  acceptedQuantity: number;
  batchNumber: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  warehouseId: string;
}

const GRN_STATUS_OPTIONS = [
  { value: "COMPLETED", label: "Completed" },
  { value: "DRAFT", label: "Draft" },
];

function computeLine(line: { quantityReceived: number; unitPrice: number; discountPct: number; taxPct: number }, taxMethod: TaxMethod) {
  const gross = line.quantityReceived * line.unitPrice;
  const base = taxMethod === "INCLUSIVE" ? gross / (1 + line.taxPct / 100) : gross;
  const discountAmt = base * ((line.discountPct || 0) / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (line.taxPct / 100);
  return { base, discountAmt, taxAmt, total: afterDiscount + taxAmt };
}

export default function NewGrnPage() {
  const { id: poId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading: optionsLoading, error: optionsError } = useQuery<{
    purchaseOrder: PurchaseOrder | null;
    warehouses: Warehouse[];
    bankAccounts: BankAccountOption[];
  }>(OPTIONS_QUERY, { variables: { poId }, skip: !poId });
  const [createGrn] = useMutation(CREATE_GRN, { refetchQueries: ["PurchasePageData"] });

  const order = data?.purchaseOrder;
  const warehouses = (data?.warehouses ?? []).filter((w) => w.active !== false);
  const bankAccounts = data?.bankAccounts ?? [];

  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<GrnLine[] | null>(null);

  const [qualityScore, setQualityScore] = useState("100");
  const [taxId, setTaxId] = useState("");
  const [status, setStatus] = useState("COMPLETED");
  const [bankAccountId, setBankAccountId] = useState("");
  const [taxMethod, setTaxMethod] = useState<TaxMethod>("EXCLUSIVE");
  const [shippingAmount, setShippingAmount] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize editable lines once the order loads (outstanding items only).
  if (order && lines === null) {
    const outstanding = order.items.filter((i) => i.receivedQuantity < i.quantity);
    setLines(
      outstanding.map((i) => ({
        key: i.id,
        purchaseOrderItemId: i.id,
        productName: i.productName,
        sku: i.sku,
        hsnSac: i.hsnSac ?? "",
        uom: i.uom,
        orderedQty: i.quantity,
        outstandingQty: i.quantity - i.receivedQuantity,
        quantityReceived: i.quantity - i.receivedQuantity,
        acceptedQuantity: i.quantity - i.receivedQuantity,
        batchNumber: "",
        unitPrice: i.unitCost,
        discountPct: 0,
        taxPct: 0,
        warehouseId: "",
      })),
    );
    setTaxMethod((order.taxMethod as TaxMethod) ?? "EXCLUSIVE");
  }

  const items = lines ?? [];
  const dirty = items.some((l) => l.quantityReceived > 0);
  const { goBack, leaving, exitTo, discardDialog } = useDiscardGuard(order ? `${ORDERS_LIST_ROUTE}` : ORDERS_LIST_ROUTE, dirty);

  const totals = useMemo(() => {
    const computed = items.map((l) => computeLine(l, taxMethod));
    const subtotal = computed.reduce((sum, c) => sum + c.base, 0);
    const discountAmount = computed.reduce((sum, c) => sum + c.discountAmt, 0);
    const tax = computed.reduce((sum, c) => sum + c.taxAmt, 0);
    const shipping = Number(shippingAmount) || 0;
    const total = subtotal - discountAmount + tax + shipping;
    return { subtotal, discountAmount, tax, shipping, total };
  }, [items, taxMethod, shippingAmount]);

  function updateLine(key: string, patch: Partial<GrnLine>) {
    setLines((prev) => (prev ? prev.map((l) => (l.key === key ? { ...l, ...patch } : l)) : prev));
  }

  async function handleSubmit() {
    if (!warehouseId) {
      setSubmitError("Select a receiving warehouse");
      return;
    }
    const toReceive = items.filter((l) => l.quantityReceived > 0);
    if (toReceive.length === 0) {
      setSubmitError("Enter a received quantity for at least one item");
      return;
    }
    setSubmitError(null);
    setBusy(true);
    try {
      await createGrn({
        variables: {
          input: {
            purchaseOrderId: poId,
            warehouseId,
            status,
            qualityScore: Number(qualityScore) || 0,
            taxId: taxId || undefined,
            bankAccountId: bankAccountId || undefined,
            taxMethod,
            supplierNotes: supplierNotes || undefined,
            termsConditions: terms || undefined,
            internalNotes: internalNotes || undefined,
            shippingAmount: Number(shippingAmount) || 0,
            items: toReceive.map((l) => ({
              purchaseOrderItemId: l.purchaseOrderItemId,
              quantityReceived: l.quantityReceived,
              acceptedQuantity: l.acceptedQuantity,
              rejectedQuantity: l.quantityReceived - l.acceptedQuantity,
              batchNumber: l.batchNumber || undefined,
              unitPrice: l.unitPrice,
              discountPct: l.discountPct,
              taxPct: l.taxPct,
              warehouseId: l.warehouseId || undefined,
            })),
          },
        },
      });
      toast.success("Goods receipt note created");
      holdSuccessThen(() => exitTo(ORDERS_LIST_ROUTE));
    } catch (err) {
      setBusy(false);
      const message = err instanceof Error ? err.message : "Failed to create goods receipt note";
      setSubmitError(message);
      toast.error(message);
    }
  }

  if (optionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
        Loading purchase order…
      </div>
    );
  }
  if (optionsError || !order) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center text-sm text-danger">
        <AlertCircle className="h-5 w-5" />
        Couldn&rsquo;t load this purchase order.
        <Button variant="outline" size="sm" onClick={() => navigate(ORDERS_LIST_ROUTE)} className="mt-2">
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <FormPage leaving={leaving}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={goBack} className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">New Goods Receipt Note</h1>
            <p className="mt-1 text-sm text-muted-foreground">Logistical and quality validation for incoming inventory — {order.poNumber}</p>
          </div>
          <Button type="button" disabled={busy || leaving} onClick={handleSubmit} className={BUTTON_PRESS}>
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save Receipt"}
          </Button>
        </div>

        {submitError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
            {submitError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2.5">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Receipt Ledger</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Verify quantities against the original order</p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="min-w-[160px] py-1.5 font-medium">Product</th>
                        <th className="min-w-[80px] py-1.5 font-medium">HSN/SAC</th>
                        <th className="min-w-[64px] py-1.5 font-medium">UOM</th>
                        <th className="min-w-[64px] py-1.5 text-right font-medium">Ordered</th>
                        <th className="min-w-[76px] py-1.5 font-medium">Received</th>
                        <th className="min-w-[76px] py-1.5 font-medium">Accepted</th>
                        <th className="min-w-[64px] py-1.5 text-right font-medium">Rejected</th>
                        <th className="min-w-[96px] py-1.5 font-medium">Batch #</th>
                        <th className="min-w-[90px] py-1.5 font-medium">Unit Price</th>
                        <th className="min-w-[72px] py-1.5 font-medium">Disc %</th>
                        <th className="min-w-[64px] py-1.5 font-medium">Tax %</th>
                        <th className="min-w-[140px] py-1.5 font-medium">Warehouse</th>
                        <th className="min-w-[96px] py-1.5 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-6 text-center text-sm text-muted-foreground">
                            This order has no outstanding items to receive.
                          </td>
                        </tr>
                      ) : (
                        items.map((l) => {
                          const line = computeLine(l, taxMethod);
                          const rejected = l.quantityReceived - l.acceptedQuantity;
                          return (
                            <tr key={l.key} className="border-b border-border last:border-0">
                              <td className="py-1 pr-2">
                                <p className="font-medium text-foreground">{l.productName}</p>
                                <p className="text-xs text-muted-foreground">{l.sku}</p>
                              </td>
                              <td className="py-1 pr-2 text-xs text-muted-foreground">{l.hsnSac || "—"}</td>
                              <td className="py-1 pr-2 text-xs text-muted-foreground">{l.uom}</td>
                              <td className="py-1 pr-2 text-right text-muted-foreground">{l.orderedQty}</td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={l.outstandingQty}
                                  value={l.quantityReceived}
                                  onChange={(e) => {
                                    const v = Math.max(0, Math.min(l.outstandingQty, Number(e.target.value)));
                                    updateLine(l.key, { quantityReceived: v, acceptedQuantity: Math.min(l.acceptedQuantity, v) });
                                  }}
                                  className={cn("h-8 w-20 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={l.quantityReceived}
                                  value={l.acceptedQuantity}
                                  onChange={(e) => updateLine(l.key, { acceptedQuantity: Math.max(0, Math.min(l.quantityReceived, Number(e.target.value))) })}
                                  className={cn("h-8 w-20 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className={cn("py-1 pr-2 text-right", rejected > 0 && "font-medium text-danger")}>{rejected}</td>
                              <td className="py-1 pr-2">
                                <Input value={l.batchNumber} onChange={(e) => updateLine(l.key, { batchNumber: e.target.value })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={l.unitPrice}
                                  onChange={(e) => updateLine(l.key, { unitPrice: Number(e.target.value) })}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={l.discountPct}
                                  onChange={(e) => updateLine(l.key, { discountPct: Number(e.target.value) })}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={l.taxPct}
                                  onChange={(e) => updateLine(l.key, { taxPct: Number(e.target.value) })}
                                  className={cn("h-8 text-xs", FOCUS_GLOW)}
                                />
                              </td>
                              <td className="py-1 pr-2">
                                <Select value={l.warehouseId} onValueChange={(v) => updateLine(l.key, { warehouseId: v })}>
                                  <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                                    <SelectValue placeholder="Default" />
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
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
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
                  <Textarea value={supplierNotes} onChange={(e) => setSupplierNotes(e.target.value)} placeholder="Add any notes for the supplier…" className={cn("min-h-[64px]", FOCUS_GLOW)} />
                </div>
                <div className="space-y-1">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add internal notes…"
                    className={cn("min-h-[64px] border-warning/30 bg-warning-bg/40 placeholder:text-warning/70", FOCUS_GLOW)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Terms &amp; Conditions</Label>
                  <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Enter terms and conditions…" className={cn("min-h-[64px]", FOCUS_GLOW)} />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2.5">
                  <CardTitle className="text-sm">Vendor Source</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-0 text-sm">
                  {order.supplierAddress ? (
                    <>
                      <p>{order.supplierAddress.line1}</p>
                      {order.supplierAddress.line2 && <p>{order.supplierAddress.line2}</p>}
                      <p className="text-muted-foreground">
                        {[order.supplierAddress.city, order.supplierAddress.state, order.supplierAddress.postalCode].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-muted-foreground">{order.supplierAddress.country}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No address on file for this order.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2.5">
                  <CardTitle className="text-sm">Delivery Point</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-0 text-sm">
                  {order.deliveryAddress ? (
                    <>
                      <p>{order.deliveryAddress.line1}</p>
                      {order.deliveryAddress.line2 && <p>{order.deliveryAddress.line2}</p>}
                      <p className="text-muted-foreground">
                        {[order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.postalCode].filter(Boolean).join(", ")}
                      </p>
                      <p className="text-muted-foreground">{order.deliveryAddress.country}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No delivery address on file for this order.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
                <Factory className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Supplier Context</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">Selected Partner</p>
                <p className="mt-0.5 text-sm font-medium">{order.supplierName}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  {order.poNumber}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Receipt Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Receiving Warehouse</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                        <SelectValue placeholder="Select" />
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
                    <Label className="text-xs text-muted-foreground">Quality Score</Label>
                    <Input type="number" min="0" max="100" value={qualityScore} onChange={(e) => setQualityScore(e.target.value)} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tax ID</Label>
                  <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Supplier Tax ID" className={cn("h-8 text-xs", FOCUS_GLOW)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRN_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5" />
                    Bank Details
                  </Label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                      <SelectValue placeholder="Select bank…" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} — {b.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-2.5 py-2 text-xs">
                  <span className="text-muted-foreground">Purchase Context</span>
                  <span className="font-mono font-medium text-foreground">{order.poNumber}</span>
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
                        name="grnTaxMethod"
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
      {discardDialog}
    </FormPage>
  );
}
