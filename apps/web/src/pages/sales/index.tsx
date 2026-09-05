import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  Wallet,
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
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { ModulePlaceholder } from "../../components/module-placeholder";
import { CARD_HOVER } from "../products/form-motion";

const TABS = [
  { key: "orders" },
  { key: "invoices" },
  { key: "quotes" },
  { key: "collections" },
  { key: "outstanding" },
] as const;
interface Customer {
  id: string;
  name: string;
}
interface Product {
  id: string;
  sku: string;
  name: string;
  sellPrice: number;
  totalStock: number;
  active?: boolean;
}
interface Warehouse {
  id: string;
  name: string;
}
interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerId: string;
  customerName: string;
  createdByName: string;
  promisedDate: string | null;
  items: OrderItem[];
  subtotal: number;
  total: number;
  hasInvoice: boolean;
  createdAt: string;
}
interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  salesOrderId: string | null;
  orderNumber: string | null;
  customerId: string;
  customerName: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  dueDate: string;
  payments: Payment[];
  createdAt: string;
}

interface QuoteItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  lineTotal: number;
}
interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  validUntil: string | null;
  reference: string | null;
  paymentTerms: string | null;
  taxMethod: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  createdByName: string;
  items: QuoteItem[];
  createdAt: string;
}

const QUOTES_QUERY = gql`
  query QuotesPageData {
    quotes {
      id
      quoteNumber
      status
      customerId
      customerName
      customerCode
      validUntil
      reference
      paymentTerms
      taxMethod
      subtotal
      discountAmount
      taxAmount
      shippingAmount
      total
      createdByName
      createdAt
      items {
        id
        productName
        sku
        quantity
        uom
        unitPrice
        lineTotal
      }
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
const DELETE_QUOTE = gql`
  mutation DeleteQuote($id: String!) {
    deleteQuote(id: $id)
  }
`;
const UPDATE_QUOTE_STATUS = gql`
  mutation UpdateQuoteStatusFromList($id: String!, $status: String!) {
    updateQuoteStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;
const DUPLICATE_QUOTE = gql`
  mutation DuplicateQuoteFromList($id: String!) {
    duplicateQuote(id: $id) {
      id
    }
  }
`;

const EXPIRING_SOON_DAYS = 7;
const ACTIVE_QUOTE_STATUSES = ["SENT", "PENDING", "APPROVED"];

const QUOTE_STAGES = ["DRAFT", "SENT", "PENDING", "APPROVED", "WON", "LOST", "EXPIRED"] as const;
const QUOTE_STAGE_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PENDING: "Pending",
  APPROVED: "Approved",
  WON: "Won",
  LOST: "Lost",
  EXPIRED: "Expired",
};

function inr(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

const BASE_QUERY = gql`
  query SalesPageData {
    salesOrders {
      id
      orderNumber
      status
      customerId
      customerName
      createdByName
      promisedDate
      subtotal
      total
      hasInvoice
      createdAt
      items {
        id
        productId
        productName
        sku
        quantity
        unitPrice
        lineTotal
      }
    }
    invoices {
      id
      invoiceNumber
      salesOrderId
      orderNumber
      customerId
      customerName
      status
      subtotal
      taxAmount
      discountAmount
      total
      amountPaid
      dueDate
      createdAt
      payments {
        id
        amount
        method
        reference
        paidAt
      }
    }
    customers {
      id
      name
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
  }
`;

const CONFIRM_ORDER = gql`
  mutation ConfirmSalesOrder($id: String!, $warehouseId: String!) {
    confirmSalesOrder(id: $id, warehouseId: $warehouseId) {
      id
    }
  }
`;
const DELETE_ORDER = gql`
  mutation DeleteSalesOrder($id: String!) {
    deleteSalesOrder(id: $id)
  }
`;
const GENERATE_INVOICE = gql`
  mutation GenerateInvoice($salesOrderId: String!) {
    generateInvoice(salesOrderId: $salesOrderId) {
      id
    }
  }
`;
const RECORD_PAYMENT = gql`
  mutation RecordPayment($input: RecordPaymentInput!) {
    recordPayment(input: $input) {
      id
    }
  }
`;

const DEFERRED_SEGMENTS: Record<string, string> = {
  returns: "Credit Notes",
};

export default function SalesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const deferredTitle = DEFERRED_SEGMENTS[segment];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "orders";

  useEffect(() => {
    if (!deferredTitle && !TABS.some((t) => t.key === segment)) {
      navigate(`/sales/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate, deferredTitle]);

  const { data, loading, refetch } = useQuery<{
    salesOrders: SalesOrder[];
    invoices: Invoice[];
    customers: Customer[];
    products: Product[];
    warehouses: Warehouse[];
  }>(BASE_QUERY);
  const { data: quotesData, loading: quotesLoading, refetch: refetchQuotes } = useQuery<{ quotes: Quote[] }>(
    QUOTES_QUERY,
    { skip: tab !== "quotes" },
  );

  const [confirmOrder] = useMutation(CONFIRM_ORDER);
  const [deleteOrder] = useMutation(DELETE_ORDER);
  const [generateInvoice] = useMutation(GENERATE_INVOICE);
  const [recordPayment] = useMutation(RECORD_PAYMENT);

  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<SalesOrder | null>(null);
  const [confirmWarehouseId, setConfirmWarehouseId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const orders = data?.salesOrders ?? [];
  const invoices = data?.invoices ?? [];
  const quotes = quotesData?.quotes ?? [];
  const warehouses = data?.warehouses ?? [];

  const collections = invoices
    .flatMap((inv) =>
      inv.payments.map((p) => ({
        ...p,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        invoice: inv,
      })),
    )
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const outstandingInvoices = invoices
    .map((inv) => ({ ...inv, remaining: inv.total - inv.amountPaid }))
    .filter((inv) => inv.remaining > 0.005)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.remaining, 0);

  async function handleConfirm() {
    if (!confirmPrompt || !confirmWarehouseId) return;
    setSubmitting(true);
    try {
      await confirmOrder({ variables: { id: confirmPrompt.id, warehouseId: confirmWarehouseId } });
      toast.success(`${confirmPrompt.orderNumber} confirmed — stock deducted`);
      setConfirmPrompt(null);
      setConfirmWarehouseId("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteOrder() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteOrder({ variables: { id: deleteTarget.id } });
      toast.success(`${deleteTarget.orderNumber} deleted`);
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateInvoice(order: SalesOrder) {
    setSubmitting(true);
    try {
      await generateInvoice({ variables: { salesOrderId: order.id } });
      toast.success(`Invoice generated for ${order.orderNumber}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate invoice");
    } finally {
      setSubmitting(false);
    }
  }

  if (deferredTitle) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">Sales orders, stock-confirmed fulfillment, and invoicing.</p>
        </div>
        <ModulePlaceholder title={deferredTitle} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tab !== "orders" && tab !== "invoices" && tab !== "quotes" && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
            <p className="text-sm text-muted-foreground">Sales orders, stock-confirmed fulfillment, and invoicing.</p>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <OrdersTab
          orders={orders}
          loading={loading}
          onNew={() => navigate("/sales/new")}
          onRowClick={(o) => navigate(`/sales/orders/${o.id}`)}
          onConfirmClick={(o) => {
            setConfirmPrompt(o);
            setConfirmWarehouseId("");
          }}
          onGenerateInvoice={handleGenerateInvoice}
          onDeleteClick={setDeleteTarget}
          onRefetch={refetch}
        />
      )}

      {tab === "invoices" && (
        <InvoicesTab invoices={invoices} loading={loading} onRowClick={setInvoiceDetail} onRefetch={refetch} />
      )}

      {tab === "collections" && (
        <CollectionsTab collections={collections} loading={loading} onRowClick={setInvoiceDetail} onRefetch={refetch} />
      )}

      {tab === "outstanding" && (
        <OutstandingTab
          outstandingInvoices={outstandingInvoices}
          totalOutstanding={totalOutstanding}
          loading={loading}
          onRowClick={setInvoiceDetail}
          onRefetch={refetch}
        />
      )}

      {tab === "quotes" && (
        <QuotesTab quotes={quotes} loading={quotesLoading} onRefetch={refetchQuotes} onNew={() => navigate("/sales/quotes/new")} />
      )}

      {/* Confirm order (choose warehouse) */}
      <Dialog open={!!confirmPrompt} onOpenChange={(o) => !o && setConfirmPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {confirmPrompt?.orderNumber}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirming deducts stock for each line item from the selected warehouse.
          </p>
          <div className="space-y-1.5">
            <Label>Fulfillment warehouse</Label>
            <Select value={confirmWarehouseId} onValueChange={setConfirmWarehouseId}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPrompt(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={submitting || !confirmWarehouseId}>
              {submitting ? "Confirming…" : "Confirm & deduct stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete order */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.orderNumber}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes the draft order.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrder} disabled={submitting}>
              {submitting ? "Deleting…" : "Delete order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice detail */}
      <Dialog open={!!invoiceDetail} onOpenChange={(o) => !o && setInvoiceDetail(null)}>
        <DialogContent className="max-w-lg">
          {invoiceDetail && (
            <InvoiceDetail
              invoice={invoiceDetail}
              submitting={submitting}
              onRecordPayment={async (amount, method, reference) => {
                setSubmitting(true);
                try {
                  await recordPayment({ variables: { input: { invoiceId: invoiceDetail.id, amount, method, reference } } });
                  toast.success("Payment recorded");
                  await refetch();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to record payment");
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

function InvoiceDetail({
  invoice,
  onRecordPayment,
  submitting,
}: {
  invoice: Invoice;
  onRecordPayment: (amount: number, method: string, reference: string | undefined) => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const remaining = invoice.total - invoice.amountPaid;

  function handlePrint() {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(`
      <html><head><title>${invoice.invoiceNumber}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1C1917} h1{margin-bottom:4px} table{width:100%;border-collapse:collapse;margin-top:16px} td,th{padding:6px 0;text-align:left;border-bottom:1px solid #E7E5E4} .right{text-align:right}</style>
      </head><body>
      <h1>Invoice ${invoice.invoiceNumber}</h1>
      <p>Customer: ${invoice.customerName}</p>
      <p>Order: ${invoice.orderNumber ?? "—"}</p>
      <p>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      <table>
        <tr><td>Subtotal</td><td class="right">${inr(invoice.subtotal)}</td></tr>
        <tr><td>Tax</td><td class="right">${inr(invoice.taxAmount)}</td></tr>
        <tr><td>Discount</td><td class="right">-${inr(invoice.discountAmount)}</td></tr>
        <tr><td><strong>Total</strong></td><td class="right"><strong>${inr(invoice.total)}</strong></td></tr>
        <tr><td>Paid</td><td class="right">${inr(invoice.amountPaid)}</td></tr>
      </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {invoice.invoiceNumber}
          <StatusBadge status={invoice.status} />
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Customer</p>
          <p>{invoice.customerName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Order</p>
          <p className="font-mono text-xs">{invoice.orderNumber || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Due date</p>
          <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total / Paid</p>
          <p>
            {inr(invoice.total)} / {inr(invoice.amountPaid)}
          </p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Payments</p>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-1.5">{inr(p.amount)}</td>
                  <td className="py-1.5 text-muted-foreground">{p.method.replaceAll("_", " ")}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {remaining > 0 && (
        <form
          className="grid grid-cols-3 gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!amount) return;
            onRecordPayment(Number(amount), method, reference || undefined);
            setAmount("");
            setReference("");
          }}
        >
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" step="0.01" min="0.01" max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="col-span-3">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Recording…" : `Record payment (remaining ${inr(remaining)})`}
            </Button>
          </div>
        </form>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Export PDF
        </Button>
      </DialogFooter>
    </div>
  );
}

type QuotesSortKey = "quoteNumber" | "customerName" | "createdAt" | "validUntil" | "total" | "status";

function isExpiringSoon(q: Quote) {
  if (!q.validUntil || !ACTIVE_QUOTE_STATUSES.includes(q.status)) return false;
  const daysLeft = (new Date(q.validUntil).getTime() - Date.now()) / 86_400_000;
  return daysLeft >= 0 && daysLeft <= EXPIRING_SOON_DAYS;
}

function isPastDue(q: Quote) {
  if (!q.validUntil || !ACTIVE_QUOTE_STATUSES.includes(q.status)) return false;
  return new Date(q.validUntil).getTime() < Date.now();
}

function QuotesTab({
  quotes,
  loading,
  onNew,
  onRefetch,
}: {
  quotes: Quote[];
  loading: boolean;
  onNew: () => void;
  onRefetch: () => void;
}) {
  const navigate = useNavigate();
  const [sendQuote] = useMutation(SEND_QUOTE);
  const [deleteQuote] = useMutation(DELETE_QUOTE);
  const [updateQuoteStatus] = useMutation(UPDATE_QUOTE_STATUS);
  const [duplicateQuote] = useMutation(DUPLICATE_QUOTE);

  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<QuotesSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleCols, setVisibleCols] = useState({ date: true, validUntil: true });
  const [deleteQuoteTarget, setDeleteQuoteTarget] = useState<Quote | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const total = quotes.length;
  const pending = quotes.filter((q) => q.status === "PENDING").length;
  const won = quotes.filter((q) => q.status === "WON").length;
  const lost = quotes.filter((q) => q.status === "LOST").length;
  const totalValue = quotes.reduce((sum, q) => sum + q.total, 0);
  const expiringSoon = quotes.filter(isExpiringSoon).length;
  const decided = won + lost;
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0;

  const widgets = [
    { label: "Total Quotes", value: loading ? "—" : String(total), icon: FileText, borderClass: "border-l-blue-500", iconBg: "bg-blue-500/10 text-blue-500" },
    { label: "Pending", value: loading ? "—" : String(pending), icon: Clock, borderClass: "border-l-warning", iconBg: "bg-warning-bg text-warning" },
    { label: "Won", value: loading ? "—" : String(won), icon: Trophy, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
    { label: "Total Value", value: loading ? "—" : inr(totalValue), icon: Wallet, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Expiring Soon", value: loading ? "—" : String(expiringSoon), icon: AlertTriangle, borderClass: "border-l-danger", iconBg: "bg-danger-bg text-danger" },
    { label: "Win Rate", value: loading ? "—" : `${winRate}%`, icon: TrendingUp, borderClass: "border-l-violet-500", iconBg: "bg-violet-500/10 text-violet-500" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) return false;
      if (!q) return true;
      return (
        quote.quoteNumber.toLowerCase().includes(q) ||
        quote.customerName.toLowerCase().includes(q) ||
        quote.customerCode.toLowerCase().includes(q)
      );
    });
  }, [quotes, search, statusFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "quoteNumber":
          return a.quoteNumber.localeCompare(b.quoteNumber) * dirMul;
        case "customerName":
          return a.customerName.localeCompare(b.customerName) * dirMul;
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dirMul;
        case "validUntil":
          return ((a.validUntil ? new Date(a.validUntil).getTime() : 0) - (b.validUntil ? new Date(b.validUntil).getTime() : 0)) * dirMul;
        case "total":
          return (a.total - b.total) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(k: string) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k as QuotesSortKey);
      setSortDir("asc");
    }
  }

  const quotesByStage = useMemo(() => {
    const map: Record<string, Quote[]> = Object.fromEntries(QUOTE_STAGES.map((s) => [s, []]));
    for (const q of filtered) map[q.status]?.push(q);
    return map;
  }, [filtered]);

  async function handleSendQuote(quote: Quote) {
    setBusyId(quote.id);
    try {
      await sendQuote({ variables: { id: quote.id } });
      toast.success(`${quote.quoteNumber} sent`);
      await onRefetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send quote");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteQuote() {
    if (!deleteQuoteTarget) return;
    setBusyId(deleteQuoteTarget.id);
    try {
      await deleteQuote({ variables: { id: deleteQuoteTarget.id } });
      toast.success(`${deleteQuoteTarget.quoteNumber} deleted`);
      setDeleteQuoteTarget(null);
      await onRefetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete quote");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDrop(target: string) {
    const draggedId = dragging;
    setDragging(null);
    if (!draggedId) return;
    const quote = quotes.find((q) => q.id === draggedId);
    if (!quote || quote.status === target) return;

    setBusyId(quote.id);
    try {
      if (quote.status === "DRAFT" && target === "SENT") {
        await sendQuote({ variables: { id: quote.id } });
      } else {
        await updateQuoteStatus({ variables: { id: quote.id, status: target } });
      }
      toast.success(`${quote.quoteNumber} moved to ${QUOTE_STAGE_LABELS[target]}`);
      await onRefetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move quote");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(quote: Quote) {
    setBusyId(quote.id);
    try {
      const res = await duplicateQuote({ variables: { id: quote.id } });
      toast.success(`${quote.quoteNumber} duplicated as a new draft`);
      const newId = res.data?.duplicateQuote?.id;
      await onRefetch();
      if (newId) navigate(`/sales/quotes/edit/${newId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate quote");
    } finally {
      setBusyId(null);
    }
  }

  function handleDownloadPdf(quote: Quote) {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    const rows = quote.items
      .map(
        (i) =>
          `<tr><td>${i.productName}</td><td class="right">${i.quantity} ${i.uom}</td><td class="right">${inr(i.unitPrice)}</td><td class="right">${inr(i.lineTotal)}</td></tr>`,
      )
      .join("");
    win.document.write(`
      <html><head><title>${quote.quoteNumber}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1C1917} h1{margin-bottom:4px} table{width:100%;border-collapse:collapse;margin-top:16px} td,th{padding:6px 0;text-align:left;border-bottom:1px solid #E7E5E4} .right{text-align:right}</style>
      </head><body>
      <h1>Quote ${quote.quoteNumber}</h1>
      <p>Customer: ${quote.customerName} (${quote.customerCode})</p>
      <p>Date: ${new Date(quote.createdAt).toLocaleDateString()}</p>
      <p>Valid until: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "—"}</p>
      <table>
        <tr><th>Product</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Line Total</th></tr>
        ${rows}
        <tr><td colspan="3"><strong>Total</strong></td><td class="right"><strong>${inr(quote.total)}</strong></td></tr>
      </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground">Draft, send, and track customer quotes before they become orders.</p>
        </div>
        <Button size="sm" onClick={onNew} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> New Quote
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {widgets.map((w) => (
          <Card key={w.label} className={cn(CARD_HOVER, "border-l-4", w.borderClass)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{w.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                </div>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", w.iconBg)}>
                  <w.icon className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search quotes by number, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {QUOTE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{QUOTE_STAGE_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setView("list")}
            >
              <List className="h-3.5 w-3.5" /> List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "kanban" ? "default" : "ghost"}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <CardContent className={view === "list" ? "p-0" : "p-4"}>
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : quotes.length === 0 ? (
            <EmptyState label="quote" onAdd={onNew} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No quotes match your search.</p>
          ) : view === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <SortHeader label="Quote #" k="quoteNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Customer" k="customerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    {visibleCols.date && <SortHeader label="Date" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                    {visibleCols.validUntil && (
                      <SortHeader label="Valid Until" k="validUntil" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    )}
                    <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Total" k="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="w-10 px-4 py-2.5 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-muted-foreground transition-colors hover:text-foreground"><Settings2 className="h-3.5 w-3.5" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(["date", "validUntil"] as const).map((col) => (
                            <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                              <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                              {col === "date" ? "Date" : "Valid Until"}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((q) => (
                    <tr
                      key={q.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                      onClick={() => navigate(`/sales/quotes/edit/${q.id}`)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-primary">{q.quoteNumber}</td>
                      <td className="px-4 py-2.5">
                        <p>{q.customerName}</p>
                        <p className="text-xs text-muted-foreground">{q.customerCode}</p>
                      </td>
                      {visibleCols.date && (
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {new Date(q.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                      )}
                      {visibleCols.validUntil && (
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex items-center gap-1", isPastDue(q) ? "text-danger" : "text-muted-foreground")}>
                            {q.validUntil ? new Date(q.validUntil).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
                            {isPastDue(q) && <AlertTriangle className="h-3.5 w-3.5" />}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-4 py-2.5 font-medium">{inr(q.total)}</td>
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" disabled={busyId === q.id}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/sales/quotes/edit/${q.id}`)}>
                              <Eye className="h-3.5 w-3.5" /> View
                            </DropdownMenuItem>
                            {q.status === "DRAFT" && (
                              <DropdownMenuItem onClick={() => navigate(`/sales/quotes/edit/${q.id}`)}>
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(q)}>
                              <Copy className="h-3.5 w-3.5" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPdf(q)}>
                              <Download className="h-3.5 w-3.5" /> Download PDF
                            </DropdownMenuItem>
                            {q.status === "DRAFT" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSendQuote(q)}>
                                  <Send className="h-3.5 w-3.5" /> Send
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => setDeleteQuoteTarget(q)}>
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {QUOTE_STAGES.map((stage) => {
                const droppable = stage !== "DRAFT" && stage !== "WON";
                return (
                  <div
                    key={stage}
                    onDragOver={(e) => droppable && e.preventDefault()}
                    onDrop={() => droppable && handleDrop(stage)}
                    className="flex min-h-[240px] w-[220px] shrink-0 flex-col gap-2 rounded-md border border-border bg-muted/30 p-2"
                  >
                    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {QUOTE_STAGE_LABELS[stage]} · {quotesByStage[stage]?.length ?? 0}
                    </p>
                    {stage === "WON" && (
                      <p className="px-1 text-[11px] text-muted-foreground">Convert from the quote page to mark Won.</p>
                    )}
                    {quotesByStage[stage]?.map((q) => {
                      const draggable = stage !== "WON" && stage !== "LOST" && stage !== "EXPIRED";
                      return (
                        <div
                          key={q.id}
                          draggable={draggable}
                          onDragStart={() => draggable && setDragging(q.id)}
                          onClick={() => navigate(`/sales/quotes/edit/${q.id}`)}
                          className={cn(
                            "space-y-1 rounded-md border border-border bg-card p-2.5 text-sm shadow-sm",
                            draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                            busyId === q.id && "opacity-50",
                          )}
                        >
                          <p className="font-mono text-xs font-medium">{q.quoteNumber}</p>
                          <p className="truncate text-muted-foreground">{q.customerName}</p>
                          <p className="font-medium">{inr(q.total)}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteQuoteTarget} onOpenChange={(o) => !o && setDeleteQuoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteQuoteTarget?.quoteNumber}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes the draft quote.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuoteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuote} disabled={busyId === deleteQuoteTarget?.id}>
              {busyId === deleteQuoteTarget?.id ? "Deleting…" : "Delete quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  k: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: string) => void;
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <th className={cn("px-4 py-2.5 font-medium", className)}>
      <button className={cn("flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground", active && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
  );
}

type OrdersSortKey = "orderNumber" | "customerName" | "createdAt" | "promisedDate" | "items" | "total" | "status";

function OrdersTab({
  orders,
  loading,
  onNew,
  onRowClick,
  onConfirmClick,
  onGenerateInvoice,
  onDeleteClick,
  onRefetch,
}: {
  orders: SalesOrder[];
  loading: boolean;
  onNew: () => void;
  onRowClick: (o: SalesOrder) => void;
  onConfirmClick: (o: SalesOrder) => void;
  onGenerateInvoice: (o: SalesOrder) => void;
  onDeleteClick: (o: SalesOrder) => void;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [sortKey, setSortKey] = useState<OrdersSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleCols, setVisibleCols] = useState({ promisedDate: true, createdBy: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const total = orders.length;
    const draftCount = orders.filter((o) => o.status === "DRAFT").length;
    const confirmedCount = orders.filter((o) => o.status === "CONFIRMED").length;
    const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");
    const revenueOrders = orders.filter((o) => o.status === "CONFIRMED" || o.status === "DELIVERED");
    const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingInvoice = revenueOrders.filter((o) => !o.hasInvoice).length;
    return {
      total,
      draftCount,
      confirmedCount,
      deliveredCount: deliveredOrders.length,
      deliveredValue: deliveredOrders.reduce((sum, o) => sum + o.total, 0),
      totalRevenue,
      pendingInvoice,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (invoiceFilter === "invoiced" && !o.hasInvoice) return false;
      if (invoiceFilter === "not_invoiced" && o.hasInvoice) return false;
      if (!q) return true;
      return o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
    });
  }, [orders, search, statusFilter, invoiceFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "orderNumber":
          return a.orderNumber.localeCompare(b.orderNumber) * dirMul;
        case "customerName":
          return a.customerName.localeCompare(b.customerName) * dirMul;
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dirMul;
        case "promisedDate":
          return ((a.promisedDate ? new Date(a.promisedDate).getTime() : 0) - (b.promisedDate ? new Date(b.promisedDate).getTime() : 0)) * dirMul;
        case "items":
          return (a.items.length - b.items.length) * dirMul;
        case "total":
          return (a.total - b.total) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(k: string) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k as OrdersSortKey);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const allPageSelected = paginated.length > 0 && paginated.every((o) => selected.has(o.id));

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach((o) => next.delete(o.id));
      else paginated.forEach((o) => next.add(o.id));
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const widgets = [
    { label: "Total Orders", value: loading ? "—" : String(stats.total), icon: ShoppingCart, iconClass: "text-slate-500", footer: `${stats.draftCount} Drafts` },
    { label: "Confirmed Orders", value: loading ? "—" : String(stats.confirmedCount), icon: CheckCircle2, iconClass: "text-emerald-500", footer: "Ready to Fulfill" },
    { label: "Delivered Orders", value: loading ? "—" : String(stats.deliveredCount), icon: Upload, iconClass: "text-blue-500", footer: inr(stats.deliveredValue) },
    { label: "Total Revenue", value: loading ? "—" : inr(stats.totalRevenue), icon: Wallet, iconClass: "text-primary", footer: `${stats.pendingInvoice} Pending Invoice` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Orders</h1>
          <p className="text-sm text-muted-foreground">Manage all your sales orders in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.success("Importing orders… (Demo)")}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.success("Exporting orders… (Demo)")}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={onNew} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New Order
          </Button>
        </div>
      </div>

      {showSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {widgets.map((w) => (
            <Card key={w.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{w.label}</span>
                  <w.icon className={cn("h-4 w-4", w.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{w.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{w.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Order List</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">List of all sales orders with status and details.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search orders…" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={invoiceFilter} onValueChange={(v) => { setInvoiceFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Invoices" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
              <SelectItem value="not_invoiced">Not Invoiced</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : orders.length === 0 ? (
            <EmptyState label="sales order" onAdd={onNew} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="w-10 px-4 py-2.5">
                        <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={allPageSelected} onChange={toggleAllOnPage} />
                      </th>
                      <SortHeader label="Order Number" k="orderNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Customer" k="customerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Order Date" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.promisedDate && <SortHeader label="Promised Date" k="promisedDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <SortHeader label="Items" k="items" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Total Amount" k="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Order Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.createdBy && <th className="px-4 py-2.5 font-medium">Created By</th>}
                      <th className="w-10 px-4 py-2.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground transition-colors hover:text-foreground"><Settings2 className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["promisedDate", "createdBy"] as const).map((col) => (
                              <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                                <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                                {col === "promisedDate" ? "Promised Date" : "Created By"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((o) => (
                      <tr
                        key={o.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                        onClick={() => onRowClick(o)}
                      >
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={selected.has(o.id)} onChange={() => toggleRow(o.id)} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">{o.orderNumber}</td>
                        <td className="px-4 py-2.5">{o.customerName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                        {visibleCols.promisedDate && (
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {o.promisedDate ? new Date(o.promisedDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-muted-foreground">{o.items.length}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{inr(o.total)}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={o.status} />
                        </td>
                        {visibleCols.createdBy && <td className="px-4 py-2.5 text-muted-foreground">{o.createdByName}</td>}
                        <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onRowClick(o)}>View Details</DropdownMenuItem>
                              {o.status === "DRAFT" && <DropdownMenuItem onClick={() => onConfirmClick(o)}>Confirm Order</DropdownMenuItem>}
                              {o.status === "CONFIRMED" && !o.hasInvoice && (
                                <DropdownMenuItem onClick={() => onGenerateInvoice(o)}>Generate Invoice</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled={o.status !== "DRAFT"} onClick={() => onDeleteClick(o)} className="text-danger focus:text-danger">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
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

type InvoicesSortKey = "invoiceNumber" | "customerName" | "total" | "amountPaid" | "dueDate" | "status";

function InvoicesTab({
  invoices,
  loading,
  onRowClick,
  onRefetch,
}: {
  invoices: Invoice[];
  loading: boolean;
  onRowClick: (inv: Invoice) => void;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<InvoicesSortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const total = invoices.length;
    const draftCount = invoices.filter((i) => i.status === "DRAFT").length;
    const totalRevenue = invoices.reduce((sum, i) => sum + i.total, 0);
    const paidAmount = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.total - i.amountPaid), 0);
    const avgInvoice = total > 0 ? totalRevenue / total : 0;
    const collectedPct = totalRevenue > 0 ? (paidAmount / totalRevenue) * 100 : 0;
    return { total, draftCount, totalRevenue, avgInvoice, paidAmount, collectedPct, overdueAmount, overdueCount: overdueInvoices.length };
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q);
    });
  }, [invoices, search, statusFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "invoiceNumber":
          return a.invoiceNumber.localeCompare(b.invoiceNumber) * dirMul;
        case "customerName":
          return a.customerName.localeCompare(b.customerName) * dirMul;
        case "total":
          return (a.total - b.total) * dirMul;
        case "amountPaid":
          return (a.amountPaid - b.amountPaid) * dirMul;
        case "dueDate":
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(k: string) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k as InvoicesSortKey);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const allPageSelected = paginated.length > 0 && paginated.every((i) => selected.has(i.id));

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach((i) => next.delete(i.id));
      else paginated.forEach((i) => next.add(i.id));
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const widgets = [
    { label: "Total Invoices", value: loading ? "—" : String(stats.total), icon: FileText, iconClass: "text-slate-500", footer: `${stats.draftCount} Drafts` },
    { label: "Total Revenue", value: loading ? "—" : inr(stats.totalRevenue), icon: Wallet, iconClass: "text-blue-500", footer: `${inr(stats.avgInvoice)} Average Invoice` },
    { label: "Paid Amount", value: loading ? "—" : inr(stats.paidAmount), icon: CheckCircle2, iconClass: "text-emerald-500", footer: `${stats.collectedPct.toFixed(1)}% Collected` },
    { label: "Overdue Amount", value: loading ? "—" : inr(stats.overdueAmount), icon: Clock, iconClass: "text-danger", footer: `${stats.overdueCount} Overdue Invoices` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage all your sales invoices.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
        </div>
      </div>

      {showSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {widgets.map((w) => (
            <Card key={w.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{w.label}</span>
                  <w.icon className={cn("h-4 w-4", w.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{w.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{w.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Invoice List</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Click a row to record a payment or export as PDF.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search invoices by number or customer…" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No invoices yet. Generate one from a confirmed order.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No invoices match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="w-10 px-4 py-2.5">
                        <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={allPageSelected} onChange={toggleAllOnPage} />
                      </th>
                      <SortHeader label="Invoice Number" k="invoiceNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Customer" k="customerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Amount" k="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Paid" k="amountPaid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Due Date" k="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="w-10 px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((inv) => {
                      const remaining = inv.total - inv.amountPaid;
                      return (
                        <tr
                          key={inv.id}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                          onClick={() => onRowClick(inv)}
                        >
                          <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={selected.has(inv.id)} onChange={() => toggleRow(inv.id)} />
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-foreground">{inv.invoiceNumber}</td>
                          <td className="px-4 py-2.5">{inv.customerName}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{inr(inv.total)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{inr(inv.amountPaid)}</td>
                          <td className={cn("px-4 py-2.5", remaining > 0 && new Date(inv.dueDate).getTime() < Date.now() ? "text-danger" : "text-muted-foreground")}>
                            {new Date(inv.dueDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onRowClick(inv)}>View / Record Payment</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
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

interface CollectionEntry extends Payment {
  invoiceNumber: string;
  customerName: string;
  invoice: Invoice;
}

type CollectionsSortKey = "invoiceNumber" | "customerName" | "amount" | "method" | "paidAt";

function CollectionsTab({
  collections,
  loading,
  onRowClick,
  onRefetch,
}: {
  collections: CollectionEntry[];
  loading: boolean;
  onRowClick: (inv: Invoice) => void;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortKey, setSortKey] = useState<CollectionsSortKey>("paidAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const stats = useMemo(() => {
    const total = collections.length;
    const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
    const now = new Date();
    const thisMonth = collections
      .filter((c) => {
        const d = new Date(c.paidAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, c) => sum + c.amount, 0);
    const avg = total > 0 ? totalCollected / total : 0;
    return { total, totalCollected, thisMonth, avg };
  }, [collections]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collections.filter((c) => {
      if (methodFilter !== "all" && c.method !== methodFilter) return false;
      if (!q) return true;
      return (
        c.invoiceNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.reference ?? "").toLowerCase().includes(q)
      );
    });
  }, [collections, search, methodFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "invoiceNumber":
          return a.invoiceNumber.localeCompare(b.invoiceNumber) * dirMul;
        case "customerName":
          return a.customerName.localeCompare(b.customerName) * dirMul;
        case "amount":
          return (a.amount - b.amount) * dirMul;
        case "method":
          return a.method.localeCompare(b.method) * dirMul;
        case "paidAt":
          return (new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(k: string) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k as CollectionsSortKey);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const widgets = [
    { label: "Total Collections", value: loading ? "—" : String(stats.total), icon: Wallet, iconClass: "text-slate-500", footer: "Payments recorded" },
    { label: "Total Collected", value: loading ? "—" : inr(stats.totalCollected), icon: CheckCircle2, iconClass: "text-emerald-500", footer: "All-time" },
    { label: "This Month", value: loading ? "—" : inr(stats.thisMonth), icon: TrendingUp, iconClass: "text-blue-500", footer: new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }) },
    { label: "Average Collection", value: loading ? "—" : inr(stats.avg), icon: FileText, iconClass: "text-primary", footer: "Per payment" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Collections</h1>
          <p className="text-sm text-muted-foreground">Every payment collected against a sales invoice.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
          {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSummary ? "Hide Summary" : "Show Summary"}
        </Button>
      </div>

      {showSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {widgets.map((w) => (
            <Card key={w.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{w.label}</span>
                  <w.icon className={cn("h-4 w-4", w.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{w.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{w.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Collection History</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Click a row to view the related invoice.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search by invoice, customer, or reference…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="All Methods" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No collections recorded yet.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No collections match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Invoice #" k="invoiceNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Customer" k="customerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Amount" k="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Method" k="method" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-4 py-2.5 font-medium">Reference</th>
                      <SortHeader label="Collected On" k="paidAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c) => (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                        onClick={() => onRowClick(c.invoice)}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-primary">{c.invoiceNumber}</td>
                        <td className="px-4 py-2.5">{c.customerName}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground">{inr(c.amount)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.method.replaceAll("_", " ")}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{c.reference || "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {new Date(c.paidAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
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

interface OutstandingEntry extends Invoice {
  remaining: number;
}

type OutstandingSortKey = "invoiceNumber" | "customerName" | "total" | "amountPaid" | "remaining" | "dueDate" | "status";

function OutstandingTab({
  outstandingInvoices,
  totalOutstanding,
  loading,
  onRowClick,
  onRefetch,
}: {
  outstandingInvoices: OutstandingEntry[];
  totalOutstanding: number;
  loading: boolean;
  onRowClick: (inv: Invoice) => void;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [dueFilter, setDueFilter] = useState("all");
  const [sortKey, setSortKey] = useState<OutstandingSortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const isOverdue = (inv: OutstandingEntry) => new Date(inv.dueDate).getTime() < Date.now();

  const stats = useMemo(() => {
    const total = outstandingInvoices.length;
    const overdue = outstandingInvoices.filter(isOverdue);
    const overdueAmount = overdue.reduce((sum, inv) => sum + inv.remaining, 0);
    const avg = total > 0 ? totalOutstanding / total : 0;
    return { total, overdueCount: overdue.length, overdueAmount, avg };
  }, [outstandingInvoices, totalOutstanding]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outstandingInvoices.filter((inv) => {
      if (dueFilter === "overdue" && !isOverdue(inv)) return false;
      if (dueFilter === "upcoming" && isOverdue(inv)) return false;
      if (!q) return true;
      return inv.invoiceNumber.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q);
    });
  }, [outstandingInvoices, search, dueFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "invoiceNumber":
          return a.invoiceNumber.localeCompare(b.invoiceNumber) * dirMul;
        case "customerName":
          return a.customerName.localeCompare(b.customerName) * dirMul;
        case "total":
          return (a.total - b.total) * dirMul;
        case "amountPaid":
          return (a.amountPaid - b.amountPaid) * dirMul;
        case "remaining":
          return (a.remaining - b.remaining) * dirMul;
        case "dueDate":
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(k: string) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k as OutstandingSortKey);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const widgets = [
    { label: "Outstanding Invoices", value: loading ? "—" : String(stats.total), icon: FileText, iconClass: "text-slate-500", footer: "Awaiting payment" },
    { label: "Total Outstanding", value: loading ? "—" : inr(totalOutstanding), icon: Wallet, iconClass: "text-primary", footer: "Remaining balance" },
    { label: "Overdue", value: loading ? "—" : String(stats.overdueCount), icon: AlertTriangle, iconClass: "text-danger", footer: "Past due date" },
    { label: "Overdue Amount", value: loading ? "—" : inr(stats.overdueAmount), icon: Clock, iconClass: "text-danger", footer: "Needs follow-up" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Outstanding</h1>
          <p className="text-sm text-muted-foreground">Invoices with a remaining balance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
          {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSummary ? "Hide Summary" : "Show Summary"}
        </Button>
      </div>

      {showSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {widgets.map((w) => (
            <Card key={w.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{w.label}</span>
                  <w.icon className={cn("h-4 w-4", w.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{w.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{w.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Outstanding Invoices</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Click a row to view the invoice or record a payment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search by invoice or customer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Select value={dueFilter} onValueChange={(v) => { setDueFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Due Dates" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Due Dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : outstandingInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nothing outstanding — all invoices are fully paid.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No invoices match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Invoice #" k="invoiceNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Customer" k="customerName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Total" k="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Paid" k="amountPaid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Remaining" k="remaining" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Due" k="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((inv) => {
                      const overdue = isOverdue(inv);
                      return (
                        <tr
                          key={inv.id}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                          onClick={() => onRowClick(inv)}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-primary">{inv.invoiceNumber}</td>
                          <td className="px-4 py-2.5">{inv.customerName}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{inr(inv.total)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{inr(inv.amountPaid)}</td>
                          <td className="px-4 py-2.5 font-medium text-danger">{inr(inv.remaining)}</td>
                          <td className={cn("px-4 py-2.5", overdue ? "text-danger" : "text-muted-foreground")}>
                            <span className="inline-flex items-center gap-1">
                              {new Date(inv.dueDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                              {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={inv.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
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

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShoppingCart className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No {label}s yet</p>
        <p className="text-sm text-muted-foreground">Get started by creating your first {label}.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Create your first {label}
      </Button>
    </div>
  );
}
