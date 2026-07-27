import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, ArrowRight, FileText, Plus, Printer, ShoppingCart, Trash2 } from "lucide-react";
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  toast,
} from "@abms/ui";

const TABS = [
  { key: "orders", label: "Sales Orders", icon: ShoppingCart },
  { key: "invoices", label: "Invoices", icon: FileText },
] as const;
type TabKey = (typeof TABS)[number]["key"];

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
  items: OrderItem[];
  subtotal: number;
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

const BASE_QUERY = gql`
  query SalesPageData {
    salesOrders {
      id
      orderNumber
      status
      customerId
      customerName
      createdByName
      subtotal
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

const CREATE_ORDER = gql`
  mutation CreateSalesOrder($input: CreateSalesOrderInput!) {
    createSalesOrder(input: $input) {
      id
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

type WizardItem = { productId: string; quantity: number; unitPrice: number };

export default function SalesPage() {
  const [tab, setTab] = useState<TabKey>("orders");
  const { data, loading, refetch } = useQuery<{
    salesOrders: SalesOrder[];
    invoices: Invoice[];
    customers: Customer[];
    products: Product[];
    warehouses: Warehouse[];
  }>(BASE_QUERY);

  const [createOrder] = useMutation(CREATE_ORDER);
  const [confirmOrder] = useMutation(CONFIRM_ORDER);
  const [deleteOrder] = useMutation(DELETE_ORDER);
  const [generateInvoice] = useMutation(GENERATE_INVOICE);
  const [recordPayment] = useMutation(RECORD_PAYMENT);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState<SalesOrder | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<SalesOrder | null>(null);
  const [confirmWarehouseId, setConfirmWarehouseId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const orders = data?.salesOrders ?? [];
  const invoices = data?.invoices ?? [];
  const customers = data?.customers ?? [];
  const products = data?.products ?? [];
  const warehouses = data?.warehouses ?? [];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">Sales orders, stock-confirmed fulfillment, and invoicing.</p>
        </div>
        {tab === "orders" && (
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Sales orders</CardTitle>
            <CardDescription>Click a row to view items, confirm fulfillment, or generate an invoice.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : orders.length === 0 ? (
              <EmptyState label="sales order" onAdd={() => setWizardOpen(true)} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Order #</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Items</th>
                    <th className="py-2 font-medium">Subtotal</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                      onClick={() => setOrderDetail(o)}
                    >
                      <td className="py-2 font-mono text-xs">{o.orderNumber}</td>
                      <td className="py-2">{o.customerName}</td>
                      <td className="py-2 text-muted-foreground">{o.items.length}</td>
                      <td className="py-2">${o.subtotal.toFixed(2)}</td>
                      <td className="py-2">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        {o.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setConfirmPrompt(o);
                              setConfirmWarehouseId("");
                            }}
                          >
                            Confirm
                          </Button>
                        )}
                        {o.status === "CONFIRMED" && !o.hasInvoice && (
                          <Button variant="ghost" size="sm" onClick={() => handleGenerateInvoice(o)}>
                            Invoice
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
      )}

      {tab === "invoices" && (
        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Click a row to record a payment or export as PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No invoices yet. Generate one from a confirmed order.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Invoice #</th>
                    <th className="py-2 font-medium">Order</th>
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium">Total</th>
                    <th className="py-2 font-medium">Paid</th>
                    <th className="py-2 font-medium">Due</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                      onClick={() => setInvoiceDetail(inv)}
                    >
                      <td className="py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{inv.orderNumber || "—"}</td>
                      <td className="py-2">{inv.customerName}</td>
                      <td className="py-2">${inv.total.toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">${inv.amountPaid.toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="py-2">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {wizardOpen && (
        <OrderWizard
          customers={customers}
          products={products}
          warehouses={warehouses}
          onClose={() => setWizardOpen(false)}
          onSaveDraft={async (customerId, items) => {
            setSubmitting(true);
            try {
              await createOrder({ variables: { input: { customerId, items } } });
              toast.success("Order saved as draft");
              setWizardOpen(false);
              await refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to save order");
            } finally {
              setSubmitting(false);
            }
          }}
          onConfirmNow={async (customerId, warehouseId, items) => {
            setSubmitting(true);
            try {
              const res = await createOrder({ variables: { input: { customerId, items } } });
              const id = res.data?.createSalesOrder?.id;
              if (id) await confirmOrder({ variables: { id, warehouseId } });
              toast.success("Order created and confirmed — stock deducted");
              setWizardOpen(false);
              await refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to confirm order");
            } finally {
              setSubmitting(false);
            }
          }}
          submitting={submitting}
        />
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
    </div>
  );
}

function OrderWizard({
  customers,
  products,
  warehouses,
  onClose,
  onSaveDraft,
  onConfirmNow,
  submitting,
}: {
  customers: Customer[];
  products: Product[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSaveDraft: (customerId: string, items: WizardItem[]) => void;
  onConfirmNow: (customerId: string, warehouseId: string, items: WizardItem[]) => void;
  submitting: boolean;
}) {
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<WizardItem[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  function addItem() {
    const product = products.find((p) => p.id === productId);
    if (!product || !quantity) return;
    setItems((prev) => [...prev, { productId: product.id, quantity: Number(quantity), unitPrice: product.sellPrice }]);
    setProductId("");
    setQuantity("1");
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New sales order — step {step} of 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fulfillment warehouse (used only if you confirm immediately)</Label>
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
            <DialogFooter>
              <Button onClick={() => setStep(2)} disabled={!customerId}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => p.active !== false)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (${p.sellPrice.toFixed(2)}, {p.totalStock} in stock)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-1.5">
                <Label>Qty</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <Button type="button" onClick={addItem} disabled={!productId}>
                Add
              </Button>
            </div>
            {items.length > 0 && (
              <table className="w-full text-sm">
                <tbody>
                  {items.map((it, idx) => {
                    const p = products.find((pr) => pr.id === it.productId);
                    return (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-1.5">{p?.name}</td>
                        <td className="py-1.5 text-right">
                          {it.quantity} × ${it.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-1.5 text-right">${(it.quantity * it.unitPrice).toFixed(2)}</td>
                        <td className="py-1.5 text-right">
                          <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={items.length === 0}>
                Review <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{selectedCustomer?.name}</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {items.map((it, idx) => {
                  const p = products.find((pr) => pr.id === it.productId);
                  return (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="py-1.5">{p?.name}</td>
                      <td className="py-1.5 text-right">{it.quantity}</td>
                      <td className="py-1.5 text-right">${(it.quantity * it.unitPrice).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end text-sm font-medium">Total: ${total.toFixed(2)}</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button variant="secondary" disabled={submitting} onClick={() => onSaveDraft(customerId, items)}>
                Save as draft
              </Button>
              <Button disabled={submitting || !warehouseId} onClick={() => onConfirmNow(customerId, warehouseId, items)}>
                {submitting ? "Confirming…" : "Confirm order"}
              </Button>
            </DialogFooter>
            {!warehouseId && <p className="text-xs text-muted-foreground">Pick a warehouse in step 1 to confirm immediately.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
