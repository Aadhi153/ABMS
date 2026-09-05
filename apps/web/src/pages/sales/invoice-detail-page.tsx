import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, CreditCard, Printer, Receipt } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { FormBreadcrumb, FormPage } from "../products/form-page";
import { BUTTON_PRESS, usePageTransition } from "../products/form-motion";

const INVOICES_LIST_ROUTE = "/sales/invoices";

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
}

interface InvoiceDetail {
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

const INVOICE_DETAIL_QUERY = gql`
  query InvoiceDetailData($id: String!) {
    invoice(id: $id) {
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
  }
`;

const RECORD_PAYMENT = gql`
  mutation RecordPaymentDetail($input: RecordPaymentInput!) {
    recordPayment(input: $input) {
      id
    }
  }
`;

function inr(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export default function InvoiceDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leaving, goWithExit } = usePageTransition();

  const { data, loading, refetch } = useQuery<{ invoice: InvoiceDetail | null }>(INVOICE_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });
  const [recordPayment] = useMutation(RECORD_PAYMENT);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const invoice = data?.invoice;
  const remaining = invoice ? invoice.total - invoice.amountPaid : 0;

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!invoice || !amount) return;
    setSubmitting(true);
    try {
      await recordPayment({ variables: { input: { invoiceId: invoice.id, amount: Number(amount), method, reference: reference || undefined } } });
      toast.success("Payment recorded");
      setAmount("");
      setReference("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    if (!invoice) return;
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

  if (loading && !data) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </FormPage>
    );
  }

  if (!loading && !invoice) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goWithExit(INVOICES_LIST_ROUTE)}
            className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Invoice not found</h1>
        </div>
      </FormPage>
    );
  }

  return (
    <FormPage leaving={leaving}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-3">
          <FormBreadcrumb
            items={[
              { label: "Sales", to: INVOICES_LIST_ROUTE },
              { label: "Invoices", to: INVOICES_LIST_ROUTE },
              { label: invoice!.invoiceNumber },
            ]}
            onNavigate={goWithExit}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{invoice!.invoiceNumber}</h1>
                  <StatusBadge status={invoice!.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{invoice!.customerName}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => goWithExit(INVOICES_LIST_ROUTE)}
              className={cn("shrink-0", BUTTON_PRESS)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Invoices
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Payments
                </CardTitle>
                <CardDescription>{invoice!.payments.length} payment{invoice!.payments.length === 1 ? "" : "s"} recorded</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {invoice!.payments.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">No payments recorded.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                        <th className="px-4 py-2.5 font-medium">Amount</th>
                        <th className="px-4 py-2.5 font-medium">Method</th>
                        <th className="px-4 py-2.5 font-medium">Reference</th>
                        <th className="px-4 py-2.5 font-medium text-right">Paid on</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice!.payments.map((p, idx) => (
                        <tr
                          key={p.id}
                          className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                          style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
                        >
                          <td className="px-4 py-2.5 font-medium">{inr(p.amount)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.method.replaceAll("_", " ")}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.reference || "—"}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{new Date(p.paidAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {remaining > 0.005 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Record a payment</CardTitle>
                  <CardDescription>Remaining balance: {inr(remaining)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleRecordPayment}>
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
                    <div className="sm:col-span-3">
                      <Button type="submit" disabled={submitting || !amount} className={BUTTON_PRESS}>
                        {submitting ? "Recording…" : `Record payment (remaining ${inr(remaining)})`}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Invoice info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <Row label="Customer" value={invoice!.customerName} />
                <Row
                  label="Order"
                  value={invoice!.orderNumber || "—"}
                  onClick={invoice!.salesOrderId ? () => navigate(`/sales/orders/${invoice!.salesOrderId}`) : undefined}
                />
                <Row label="Due date" value={new Date(invoice!.dueDate).toLocaleDateString()} />
                <Row label="Created" value={new Date(invoice!.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Financial summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{inr(invoice!.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>-{inr(invoice!.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{inr(invoice!.taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span>{inr(invoice!.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid</span>
                  <span>{inr(invoice!.amountPaid)}</span>
                </div>
                {remaining > 0.005 ? (
                  <Badge tone="warning" className="mt-1">
                    {inr(remaining)} outstanding
                  </Badge>
                ) : (
                  <Badge tone="success" className="mt-1">
                    Paid in full
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handlePrint} className={cn("w-full gap-1.5", BUTTON_PRESS)}>
                  <Printer className="h-4 w-4" />
                  Export PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FormPage>
  );
}

function Row({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {onClick ? (
        <button type="button" onClick={onClick} className="text-right font-medium text-primary hover:underline">
          {value}
        </button>
      ) : (
        <span className="text-right font-medium text-foreground">{value}</span>
      )}
    </div>
  );
}
