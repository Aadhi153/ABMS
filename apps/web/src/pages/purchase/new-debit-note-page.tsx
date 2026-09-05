import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { AlertCircle, ArrowLeft, Factory, FileMinus, Landmark, Loader2, Plus, Save, StickyNote, Trash2, Wallet } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, cn, toast } from "@abms/ui";
import { FormPage, useDiscardGuard } from "../products/form-page";
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";
import { inr } from "./purchase-helpers";
import type { SupplierBill, Warehouse, BankAccountOption, Product } from "./types";

const DEBIT_NOTES_LIST_ROUTE = "/purchase/debitnotes";

const OPTIONS_QUERY = gql`
  query NewDebitNoteOptions($billId: String!) {
    supplierBill(id: $billId) {
      id
      billNumber
      supplierId
      supplierName
      remaining
      taxMethod
      billingAddress { line1 line2 city state postalCode country }
      items {
        id
        productId
        productName
        sku
        quantity
        uom
        unitCost
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
    products {
      id
      sku
      name
      costPrice
      active
    }
  }
`;

const CREATE_DEBIT_NOTE = gql`
  mutation CreateDebitNote($input: CreateDebitNoteInput!) {
    createDebitNote(input: $input) {
      id
    }
  }
`;

type TaxMethod = "EXCLUSIVE" | "INCLUSIVE";
type DebitNoteType = "SUPPLIER_DEBIT" | "PURCHASE_RETURN" | "OTHER";

interface AdjustmentLine {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
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

const TYPE_OPTIONS: Array<{ value: DebitNoteType; label: string }> = [
  { value: "PURCHASE_RETURN", label: "Purchase Return" },
  { value: "SUPPLIER_DEBIT", label: "Supplier Debit" },
  { value: "OTHER", label: "Other" },
];
const UOM_OPTIONS = ["unit", "pcs", "box", "kg", "gram", "ltr", "ml", "dozen", "meter", "set"];

function computeLine(item: { quantity: number; unitPrice: number; discountPct: number; taxPct: number }, taxMethod: TaxMethod) {
  const gross = item.quantity * item.unitPrice;
  const base = taxMethod === "INCLUSIVE" ? gross / (1 + item.taxPct / 100) : gross;
  const discountAmt = base * ((item.discountPct || 0) / 100);
  const afterDiscount = base - discountAmt;
  const taxAmt = afterDiscount * (item.taxPct / 100);
  return { base, discountAmt, taxAmt, total: afterDiscount + taxAmt };
}

let itemSeq = 0;

function addressToInput(a: AddressForm) {
  if (!a.line1 && !a.line2 && !a.city && !a.state && !a.postalCode) return undefined;
  return { line1: a.line1 || undefined, line2: a.line2 || undefined, city: a.city || undefined, state: a.state || undefined, postalCode: a.postalCode || undefined, country: a.country || undefined };
}

export default function NewDebitNotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billId = searchParams.get("billId");

  const { data, loading, error } = useQuery<{
    supplierBill: SupplierBill | null;
    warehouses: Warehouse[];
    bankAccounts: BankAccountOption[];
    products: Product[];
  }>(OPTIONS_QUERY, { variables: { billId }, skip: !billId });
  const [createDebitNote] = useMutation(CREATE_DEBIT_NOTE, { refetchQueries: ["PurchasePageData"] });

  const bill = data?.supplierBill;
  const warehouses = (data?.warehouses ?? []).filter((w) => w.active !== false);
  const bankAccounts = data?.bankAccounts ?? [];
  const products = data?.products ?? [];

  const [lines, setLines] = useState<AdjustmentLine[] | null>(null);
  const [type, setType] = useState<DebitNoteType>("PURCHASE_RETURN");
  const [warehouseId, setWarehouseId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [linkedDocId, setLinkedDocId] = useState("");
  const [taxId, setTaxId] = useState("");
  const [settlementAccountId, setSettlementAccountId] = useState("");
  const [taxMethod, setTaxMethod] = useState<TaxMethod>("EXCLUSIVE");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [reason, setReason] = useState("");
  const [partnerAddress, setPartnerAddress] = useState<AddressForm>(EMPTY_ADDRESS);

  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (bill && lines === null) {
      setTaxMethod((bill.taxMethod as TaxMethod) ?? "EXCLUSIVE");
      if (bill.billingAddress) {
        setPartnerAddress({
          line1: bill.billingAddress.line1 ?? "",
          line2: bill.billingAddress.line2 ?? "",
          city: bill.billingAddress.city ?? "",
          state: bill.billingAddress.state ?? "",
          postalCode: bill.billingAddress.postalCode ?? "",
          country: bill.billingAddress.country ?? "India",
        });
      }
      setLines(
        bill.items.map((i) => {
          itemSeq += 1;
          return { key: `line-${itemSeq}`, productId: i.productId, productName: i.productName, quantity: 0, uom: i.uom, unitPrice: i.unitCost, discountPct: 0, taxPct: 0 };
        }),
      );
    }
  }, [bill, lines]);

  const items = lines ?? [];
  const dirty = items.some((l) => l.quantity > 0) || !!reason;
  const { goBack, leaving, exitTo, discardDialog } = useDiscardGuard(DEBIT_NOTES_LIST_ROUTE, dirty);

  const totals = useMemo(() => {
    const computed = items.filter((l) => l.quantity > 0).map((l) => computeLine(l, taxMethod));
    const gross = computed.reduce((sum, c) => sum + c.base, 0);
    const discountAmount = computed.reduce((sum, c) => sum + c.discountAmt, 0);
    const tax = computed.reduce((sum, c) => sum + c.taxAmt, 0);
    const total = gross - discountAmount + tax;
    return { gross, discountAmount, tax, total };
  }, [items, taxMethod]);

  function updateLine(key: string, patch: Partial<AdjustmentLine>) {
    setLines((prev) => (prev ? prev.map((l) => (l.key === key ? { ...l, ...patch } : l)) : prev));
  }
  function removeLine(key: string) {
    setLines((prev) => (prev ? prev.filter((l) => l.key !== key) : prev));
  }
  function addLine() {
    itemSeq += 1;
    const first = products[0];
    setLines((prev) => [...(prev ?? []), { key: `line-${itemSeq}`, productId: first?.id ?? "", productName: first?.name ?? "", quantity: 1, uom: "unit", unitPrice: first?.costPrice ?? 0, discountPct: 0, taxPct: 0 }]);
  }
  function pickProduct(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateLine(key, { productId, productName: product?.name ?? "", unitPrice: product?.costPrice ?? 0 });
  }

  async function handleSubmit() {
    if (!billId || !bill) return;
    if (type === "PURCHASE_RETURN" && !warehouseId) {
      setSubmitError("Select the warehouse this return is coming from");
      return;
    }
    if (!reason.trim()) {
      setSubmitError("Add a reason for this adjustment");
      return;
    }
    const activeLines = items.filter((l) => l.quantity > 0 && l.productId);
    if (activeLines.length === 0) {
      setSubmitError("Add at least one adjustment line with a quantity");
      return;
    }
    setSubmitError(null);
    setBusy(true);
    try {
      await createDebitNote({
        variables: {
          input: {
            billId,
            type,
            warehouseId: type === "PURCHASE_RETURN" ? warehouseId : undefined,
            issueDate,
            dueDate: dueDate || undefined,
            linkedDocId: linkedDocId || undefined,
            taxId: taxId || undefined,
            settlementAccountId: settlementAccountId || undefined,
            taxMethod,
            supplierNotes: supplierNotes || undefined,
            termsConditions: terms || undefined,
            internalNotes: internalNotes || undefined,
            partnerAddress: addressToInput(partnerAddress),
            reason: reason.trim(),
            items: activeLines.map((l) => ({ productId: l.productId, quantity: l.quantity, uom: l.uom, unitPrice: l.unitPrice, discountPct: l.discountPct, taxPct: l.taxPct })),
          },
        },
      });
      toast.success("Debit note created");
      holdSuccessThen(() => exitTo(DEBIT_NOTES_LIST_ROUTE));
    } catch (err) {
      setBusy(false);
      const message = err instanceof Error ? err.message : "Failed to create debit note";
      setSubmitError(message);
      toast.error(message);
    }
  }

  if (!billId) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center text-sm text-muted-foreground">
        <FileMinus className="h-6 w-6" />
        Pick a purchase invoice to issue a debit note against.
        <Button variant="outline" size="sm" onClick={() => navigate("/purchase/bills")} className="mt-2">
          Go to Purchase Invoices
        </Button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
        Loading purchase invoice…
      </div>
    );
  }
  if (error || !bill) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center text-sm text-danger">
        <AlertCircle className="h-5 w-5" />
        Couldn&rsquo;t load this purchase invoice.
        <Button variant="outline" size="sm" onClick={() => navigate("/purchase/bills")} className="mt-2">
          Back to Purchase Invoices
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
            <h1 className="text-2xl font-bold tracking-tight">New Debit Note</h1>
            <p className="mt-1 text-sm text-muted-foreground">Adjust purchase values with formal debit accounting — {bill.billNumber}</p>
          </div>
          <Button type="button" disabled={busy || leaving} onClick={handleSubmit} className={BUTTON_PRESS}>
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save Debit Note"}
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
                  <FileMinus className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Adjustments Ledger</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Quantify deviations and penalties</p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="min-w-[200px] py-1.5 font-medium">Product</th>
                        <th className="min-w-[64px] py-1.5 font-medium">Qty</th>
                        <th className="min-w-[84px] py-1.5 font-medium">UOM</th>
                        <th className="min-w-[96px] py-1.5 font-medium">Unit Price</th>
                        <th className="min-w-[80px] py-1.5 font-medium">Disc %</th>
                        <th className="min-w-[72px] py-1.5 font-medium">Tax %</th>
                        <th className="min-w-[96px] py-1.5 text-right font-medium">Total</th>
                        <th className="w-8 py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                            No adjustments added yet.
                          </td>
                        </tr>
                      ) : (
                        items.map((l) => {
                          const line = computeLine(l, taxMethod);
                          return (
                            <tr key={l.key} className="border-b border-border last:border-0">
                              <td className="py-1 pr-2">
                                <Select value={l.productId} onValueChange={(v) => pickProduct(l.key, v)}>
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
                                <Input type="number" min="0" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) })} className={cn("h-8 w-20 text-xs", FOCUS_GLOW)} />
                              </td>
                              <td className="py-1 pr-2">
                                <Select value={l.uom} onValueChange={(v) => updateLine(l.key, { uom: v })}>
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
                                <Input type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => updateLine(l.key, { unitPrice: Number(e.target.value) })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                              </td>
                              <td className="py-1 pr-2">
                                <Input type="number" min="0" max="100" value={l.discountPct} onChange={(e) => updateLine(l.key, { discountPct: Number(e.target.value) })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                              </td>
                              <td className="py-1 pr-2">
                                <Input type="number" min="0" max="100" value={l.taxPct} onChange={(e) => updateLine(l.key, { taxPct: Number(e.target.value) })} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                              </td>
                              <td className="py-1 text-right font-medium">{inr(line.total)}</td>
                              <td className="py-1 text-right">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(l.key)}>
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
                <div className="mt-2.5">
                  <Button type="button" variant="ghost" size="sm" onClick={addLine} className={cn("gap-1.5 px-2 text-primary hover:bg-primary/5 hover:text-primary", BUTTON_PRESS)}>
                    <Plus className="h-4 w-4" />
                    Add Adjustment
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 p-4 pb-2.5">
                <StickyNote className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Notes &amp; Rationale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <p className="text-xs text-muted-foreground">Why this adjustment is being issued</p>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 3 units returned — damaged in transit" className={cn("min-h-[56px]", FOCUS_GLOW)} />
                </div>
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
                  <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Enter terms and conditions…" className={cn("min-h-[64px]", FOCUS_GLOW)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2.5">
                <CardTitle className="text-sm">Partner Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Address Line 1</Label>
                  <Input value={partnerAddress.line1} onChange={(e) => setPartnerAddress((a) => ({ ...a, line1: e.target.value }))} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Address Line 2</Label>
                  <Input value={partnerAddress.line2} onChange={(e) => setPartnerAddress((a) => ({ ...a, line2: e.target.value }))} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <Input value={partnerAddress.city} onChange={(e) => setPartnerAddress((a) => ({ ...a, city: e.target.value }))} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <Input value={partnerAddress.state} onChange={(e) => setPartnerAddress((a) => ({ ...a, state: e.target.value }))} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ZIP Code</Label>
                    <Input value={partnerAddress.postalCode} onChange={(e) => setPartnerAddress((a) => ({ ...a, postalCode: e.target.value }))} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <Input value={partnerAddress.country} onChange={(e) => setPartnerAddress((a) => ({ ...a, country: e.target.value }))} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                <p className="mt-0.5 text-sm font-medium">{bill.supplierName}</p>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-2.5 py-2 text-xs">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono font-medium text-foreground">{bill.billNumber}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between rounded-lg bg-muted px-2.5 py-2 text-xs">
                  <span className="text-muted-foreground">Remaining balance</span>
                  <span className="font-medium text-foreground">{inr(bill.remaining)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Note Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as DebitNoteType)}>
                    <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {type === "PURCHASE_RETURN" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Warehouse</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
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
                    <p className="text-[11px] text-muted-foreground">Returned quantities are deducted from this warehouse&rsquo;s stock.</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Issue Date</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Due Date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={cn("h-8 text-xs", FOCUS_GLOW)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Linked Doc ID</Label>
                  <Input value={linkedDocId} onChange={(e) => setLinkedDocId(e.target.value)} placeholder="e.g. INV-123" className={cn("h-8 text-xs", FOCUS_GLOW)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tax ID</Label>
                  <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Supplier Tax ID / GSTIN" className={cn("h-8 text-xs", FOCUS_GLOW)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5" />
                    Settlement Account
                  </Label>
                  <Select value={settlementAccountId} onValueChange={setSettlementAccountId}>
                    <SelectTrigger className={cn("h-8 text-xs", FOCUS_GLOW)}>
                      <SelectValue placeholder="Select bank account" />
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Adjustment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5 rounded-lg border border-border p-2.5">
                  <p className="text-xs font-medium text-foreground">Tax Calculation Method</p>
                  {(
                    [
                      { value: "EXCLUSIVE", label: "Exclusive", hint: "Tax added on top" },
                      { value: "INCLUSIVE", label: "Inclusive", hint: "Tax included in price" },
                    ] as const
                  ).map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted">
                      <input type="radio" name="dnTaxMethod" value={opt.value} checked={taxMethod === opt.value} onChange={() => setTaxMethod(opt.value)} className="h-3.5 w-3.5 accent-primary" />
                      <span className="text-foreground">
                        {opt.label} <span className="text-muted-foreground">({opt.hint})</span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gross Amount</span>
                    <span>{inr(totals.gross)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount Amount</span>
                    <span className="text-danger">{inr(totals.discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{inr(totals.tax)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold">Total Adjustable</span>
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
