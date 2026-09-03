import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  Trash2,
  Upload,
  Wallet,
} from "lucide-react";
import {
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
  const [sendQuote] = useMutation(SEND_QUOTE);
  const [deleteQuote] = useMutation(DELETE_QUOTE);

  const [orderDetail, setOrderDetail] = useState<SalesOrder | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [deleteQuoteTarget, setDeleteQuoteTarget] = useState<Quote | null>(null);
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
      })),
    )
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const outstandingInvoices = invoices
    .map((inv) => ({ ...inv, remaining: inv.total - inv.amountPaid }))
    .filter((inv) => inv.remaining > 0.005)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.remaining, 0);

  async function handleSendQuote(quote: Quote) {
    setSubmitting(true);
    try {
      await sendQuote({ variables: { id: quote.id } });
      toast.success(`${quote.quoteNumber} sent`);
      await refetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send quote");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteQuote() {
    if (!deleteQuoteTarget) return;
    setSubmitting(true);
    try {
      await deleteQuote({ variables: { id: deleteQuoteTarget.id } });
      toast.success(`${deleteQuoteTarget.quoteNumber} deleted`);
      setDeleteQuoteTarget(null);
      await refetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete quote");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!confirmPrompt || !confirmWarehouseId) return;
    setSubmitting(true);
    try {
      await confirmOrder({ variables: { id: confirmPrompt.id, warehouseId: confirmWarehouseId } });
      toast.success(`${confirmPrompt.orderNumber} confirmed — stock deducted`);
      setConfirmPrompt(null);
      setConfirmWarehouseId("");
      setOrderDetail(null);
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
      setOrderDetail(null);
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
      setOrderDetail(null);
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
      {tab !== "orders" && tab !== "invoices" && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
            <p className="text-sm text-muted-foreground">Sales orders, stock-confirmed fulfillment, and invoicing.</p>
          </div>
          {tab === "quotes" && (
            <Button size="sm" onClick={() => navigate("/sales/quotes/new")}>
              <Plus className="h-4 w-4" />
              New Quote
            </Button>
          )}
        </div>
      )}

      {tab === "orders" && (
        <OrdersTab
          orders={orders}
          loading={loading}
          onNew={() => navigate("/sales/new")}
          onRowClick={setOrderDetail}
          onConfirmClick={(o) => {
            setConfirmPrompt(o);
            setConfirmWarehouseId("");
          }}
          onGenerateInvoice={handleGenerateInvoice}
          onRefetch={refetch}
        />
      )}

      {tab === "invoices" && (
        <InvoicesTab invoices={invoices} loading={loading} onRowClick={setInvoiceDetail} onRefetch={refetch} />
      )}

      {tab === "collections" && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Collections</CardTitle>
            <CardDescription>Every payment collected against a sales invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No collections recorded yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Invoice #</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Amount</th>
                    <th className="py-2 font-medium">Method</th>
                    <th className="py-2 font-medium">Reference</th>
                    <th className="py-2 font-medium">Collected On</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-2 font-mono text-xs">{c.invoiceNumber}</td>
                      <td className="py-2">{c.customerName}</td>
                      <td className="py-2">${c.amount.toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">{c.method.replaceAll("_", " ")}</td>
                      <td className="py-2 text-muted-foreground">{c.reference || "—"}</td>
                      <td className="py-2 text-muted-foreground">{new Date(c.paidAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "outstanding" && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Outstanding</CardTitle>
            <CardDescription>
              Invoices with a remaining balance
              {outstandingInvoices.length > 0 && ` — $${totalOutstanding.toFixed(2)} total due`}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : outstandingInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nothing outstanding — all invoices are fully paid.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Invoice #</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Total</th>
                    <th className="py-2 font-medium">Paid</th>
                    <th className="py-2 font-medium">Remaining</th>
                    <th className="py-2 font-medium">Due</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingInvoices.map((inv) => {
                    const overdue = new Date(inv.dueDate).getTime() < Date.now();
                    return (
                      <tr
                        key={inv.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                        onClick={() => setInvoiceDetail(inv)}
                      >
                        <td className="py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="py-2">{inv.customerName}</td>
                        <td className="py-2">${inv.total.toFixed(2)}</td>
                        <td className="py-2 text-muted-foreground">${inv.amountPaid.toFixed(2)}</td>
                        <td className="py-2 font-medium text-danger">${inv.remaining.toFixed(2)}</td>
                        <td className={cn("py-2", overdue ? "text-danger" : "text-muted-foreground")}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-2">
                          <StatusBadge status={inv.status} />
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

      {tab === "quotes" && (
        <>
          <QuotesDashboard quotes={quotes} loading={quotesLoading} />
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>Draft, send, and track customer quotes before they become orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {quotesLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : quotes.length === 0 ? (
                <EmptyState label="quote" onAdd={() => navigate("/sales/quotes/new")} />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 font-medium">Quote #</th>
                      <th className="py-2 font-medium">Customer</th>
                      <th className="py-2 font-medium">Items</th>
                      <th className="py-2 font-medium">Total</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr
                        key={q.id}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                        onClick={() => navigate(`/sales/quotes/edit/${q.id}`)}
                      >
                        <td className="py-2 font-mono text-xs">{q.quoteNumber}</td>
                        <td className="py-2">{q.customerName}</td>
                        <td className="py-2 text-muted-foreground">{q.items.length}</td>
                        <td className="py-2">{inr(q.total)}</td>
                        <td className="py-2">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          {q.status === "DRAFT" && (
                            <Button variant="ghost" size="sm" onClick={() => handleSendQuote(q)} disabled={submitting}>
                              Send
                            </Button>
                          )}
                          {q.status === "DRAFT" && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleteQuoteTarget(q)}>
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Order detail */}
      <Dialog open={!!orderDetail} onOpenChange={(o) => !o && setOrderDetail(null)}>
        <DialogContent className="max-w-lg">
          {orderDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {orderDetail.orderNumber}
                  <StatusBadge status={orderDetail.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p>{orderDetail.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created by</p>
                  <p>{orderDetail.createdByName}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1.5 font-medium">Product</th>
                    <th className="py-1.5 font-medium text-right">Qty</th>
                    <th className="py-1.5 font-medium text-right">Price</th>
                    <th className="py-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetail.items.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0">
                      <td className="py-1.5">{i.productName}</td>
                      <td className="py-1.5 text-right">{i.quantity}</td>
                      <td className="py-1.5 text-right">${i.unitPrice.toFixed(2)}</td>
                      <td className="py-1.5 text-right">${i.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end text-sm font-medium">Subtotal: ${orderDetail.subtotal.toFixed(2)}</div>
              <DialogFooter>
                {orderDetail.status === "DRAFT" && (
                  <Button variant="outline" onClick={() => setDeleteTarget(orderDetail)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
                {orderDetail.status === "DRAFT" && (
                  <Button
                    onClick={() => {
                      setConfirmPrompt(orderDetail);
                      setConfirmWarehouseId("");
                    }}
                  >
                    Confirm order
                  </Button>
                )}
                {orderDetail.status === "CONFIRMED" && !orderDetail.hasInvoice && (
                  <Button onClick={() => handleGenerateInvoice(orderDetail)} disabled={submitting}>
                    Generate invoice
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Delete quote */}
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
            <Button variant="destructive" onClick={handleDeleteQuote} disabled={submitting}>
              {submitting ? "Deleting…" : "Delete quote"}
            </Button>
          </DialogFooter>
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
        <tr><td>Subtotal</td><td class="right">$${invoice.subtotal.toFixed(2)}</td></tr>
        <tr><td>Tax</td><td class="right">$${invoice.taxAmount.toFixed(2)}</td></tr>
        <tr><td>Discount</td><td class="right">-$${invoice.discountAmount.toFixed(2)}</td></tr>
        <tr><td><strong>Total</strong></td><td class="right"><strong>$${invoice.total.toFixed(2)}</strong></td></tr>
        <tr><td>Paid</td><td class="right">$${invoice.amountPaid.toFixed(2)}</td></tr>
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
            ${invoice.total.toFixed(2)} / ${invoice.amountPaid.toFixed(2)}
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
                  <td className="py-1.5">${p.amount.toFixed(2)}</td>
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
              {submitting ? "Recording…" : `Record payment (remaining $${remaining.toFixed(2)})`}
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

function QuotesDashboard({ quotes, loading }: { quotes: Quote[]; loading: boolean }) {
  const total = quotes.length;
  const pending = quotes.filter((q) => q.status === "SENT").length;
  const accepted = quotes.filter((q) => q.status === "ACCEPTED").length;
  const decided = quotes.filter((q) => ["ACCEPTED", "REJECTED", "EXPIRED"].includes(q.status)).length;
  const winRate = decided > 0 ? Math.round((accepted / decided) * 100) : null;
  const pipelineValue = quotes
    .filter((q) => q.status === "DRAFT" || q.status === "SENT")
    .reduce((sum, q) => sum + q.total, 0);

  const widgets = [
    {
      label: "Total Quotes",
      value: loading ? "—" : String(total),
      icon: FileText,
      iconClass: "text-slate-500",
      footer: "All time",
    },
    {
      label: "Pending Response",
      value: loading ? "—" : String(pending),
      icon: Clock,
      iconClass: "text-warning",
      footer: "Awaiting customer",
    },
    {
      label: "Accepted",
      value: loading ? "—" : String(accepted),
      icon: CheckCircle2,
      iconClass: "text-success",
      footer: winRate === null ? "No decisions yet" : `${winRate}% win rate`,
    },
    {
      label: "Pipeline Value",
      value: loading ? "—" : inr(pipelineValue),
      icon: Wallet,
      iconClass: "text-primary",
      footer: "Draft + sent value",
    },
  ];

  return (
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
  onRefetch,
}: {
  orders: SalesOrder[];
  loading: boolean;
  onNew: () => void;
  onRowClick: (o: SalesOrder) => void;
  onConfirmClick: (o: SalesOrder) => void;
  onGenerateInvoice: (o: SalesOrder) => void;
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
                              <DropdownMenuItem disabled={o.status !== "DRAFT"} onClick={() => onRowClick(o)} className="text-danger focus:text-danger">
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
