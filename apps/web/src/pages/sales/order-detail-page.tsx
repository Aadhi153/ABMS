import { useState } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, CheckCircle2, FileText, Package, ShoppingCart, Trash2, Truck } from "lucide-react";
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

const ORDERS_LIST_ROUTE = "/sales/orders";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  hsnSac: string | null;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  warehouseName: string | null;
  lineTotal: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  customerId: string;
  customerName: string;
  promisedDate: string | null;
  reference: string | null;
  paymentTerms: string | null;
  priceListName: string | null;
  taxMethod: string;
  customerNotes: string | null;
  termsConditions: string | null;
  internalNotes: string | null;
  shippingAmount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdByName: string;
  items: OrderItem[];
  hasInvoice: boolean;
  createdAt: string;
}

interface Warehouse {
  id: string;
  name: string;
  active: boolean;
}

const ORDER_DETAIL_QUERY = gql`
  query SalesOrderDetail($id: String!) {
    salesOrder(id: $id) {
      id
      orderNumber
      status
      customerId
      customerName
      promisedDate
      reference
      paymentTerms
      priceListName
      taxMethod
      customerNotes
      termsConditions
      internalNotes
      shippingAmount
      subtotal
      discountAmount
      taxAmount
      total
      createdByName
      hasInvoice
      createdAt
      items {
        id
        productName
        sku
        hsnSac
        quantity
        uom
        unitPrice
        discountPct
        taxPct
        warehouseName
        lineTotal
      }
    }
    warehouses {
      id
      name
      active
    }
  }
`;

const CONFIRM_ORDER = gql`
  mutation ConfirmSalesOrderDetail($id: String!, $warehouseId: String!) {
    confirmSalesOrder(id: $id, warehouseId: $warehouseId) {
      id
    }
  }
`;
const DELETE_ORDER = gql`
  mutation DeleteSalesOrderDetail($id: String!) {
    deleteSalesOrder(id: $id)
  }
`;
const GENERATE_INVOICE = gql`
  mutation GenerateInvoiceDetail($salesOrderId: String!) {
    generateInvoice(salesOrderId: $salesOrderId) {
      id
    }
  }
`;

function inr(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export default function OrderDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { leaving, goWithExit } = usePageTransition();

  const { data, loading, refetch } = useQuery<{ salesOrder: OrderDetail | null; warehouses: Warehouse[] }>(
    ORDER_DETAIL_QUERY,
    { variables: { id }, skip: !id },
  );
  const [confirmOrder] = useMutation(CONFIRM_ORDER);
  const [deleteOrder] = useMutation(DELETE_ORDER);
  const [generateInvoice] = useMutation(GENERATE_INVOICE);

  const [confirming, setConfirming] = useState(false);
  const [confirmWarehouseId, setConfirmWarehouseId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const order = data?.salesOrder;
  const warehouses = (data?.warehouses ?? []).filter((w) => w.active);

  async function handleConfirm() {
    if (!order || !confirmWarehouseId) return;
    setSubmitting(true);
    try {
      await confirmOrder({ variables: { id: order.id, warehouseId: confirmWarehouseId } });
      toast.success(`${order.orderNumber} confirmed — stock deducted`);
      setConfirming(false);
      setConfirmWarehouseId("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!order) return;
    setSubmitting(true);
    try {
      await deleteOrder({ variables: { id: order.id } });
      toast.success(`${order.orderNumber} deleted`);
      goWithExit(ORDERS_LIST_ROUTE);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete order");
      setSubmitting(false);
      setDeleting(false);
    }
  }

  async function handleGenerateInvoice() {
    if (!order) return;
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

  if (!loading && !order) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goWithExit(ORDERS_LIST_ROUTE)}
            className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Order not found</h1>
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
              { label: "Sales", to: ORDERS_LIST_ROUTE },
              { label: "Orders", to: ORDERS_LIST_ROUTE },
              { label: order!.orderNumber },
            ]}
            onNavigate={goWithExit}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{order!.orderNumber}</h1>
                  <StatusBadge status={order!.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{order!.customerName}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => goWithExit(ORDERS_LIST_ROUTE)}
              className={cn("shrink-0", BUTTON_PRESS)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Orders
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Items
                </CardTitle>
                <CardDescription>{order!.items.length} line item{order!.items.length === 1 ? "" : "s"}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="px-4 py-2.5 font-medium">Warehouse</th>
                      <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                      <th className="px-4 py-2.5 font-medium text-right">Price</th>
                      <th className="px-4 py-2.5 font-medium text-right">Disc%</th>
                      <th className="px-4 py-2.5 font-medium text-right">Tax%</th>
                      <th className="px-4 py-2.5 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order!.items.map((i, idx) => (
                      <tr
                        key={i.id}
                        className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                        style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{i.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {i.sku}
                            {i.hsnSac ? ` · HSN ${i.hsnSac}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{i.warehouseName || "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          {i.quantity} {i.uom}
                        </td>
                        <td className="px-4 py-2.5 text-right">{inr(i.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{i.discountPct || 0}%</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{i.taxPct || 0}%</td>
                        <td className="px-4 py-2.5 text-right font-medium">{inr(i.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {(order!.customerNotes || order!.termsConditions || order!.internalNotes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {order!.customerNotes && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Customer notes</p>
                      <p className="mt-0.5">{order!.customerNotes}</p>
                    </div>
                  )}
                  {order!.termsConditions && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Terms &amp; conditions</p>
                      <p className="mt-0.5">{order!.termsConditions}</p>
                    </div>
                  )}
                  {order!.internalNotes && (
                    <div>
                      <p className="text-xs font-medium uppercase text-muted-foreground">Internal notes</p>
                      <p className="mt-0.5">{order!.internalNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Order info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <Row label="Created by" value={order!.createdByName} />
                <Row label="Created" value={new Date(order!.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} />
                <Row label="Promised date" value={order!.promisedDate ? new Date(order!.promisedDate).toLocaleDateString() : "—"} />
                <Row label="Reference" value={order!.reference || "—"} />
                <Row label="Payment terms" value={order!.paymentTerms || "—"} />
                <Row label="Price list" value={order!.priceListName || "—"} />
                <Row label="Tax method" value={order!.taxMethod} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Financial summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{inr(order!.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>-{inr(order!.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{inr(order!.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{inr(order!.shippingAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span>{inr(order!.total)}</span>
                </div>
                {order!.hasInvoice && (
                  <Badge tone="info" className="mt-1">
                    Invoiced
                  </Badge>
                )}
              </CardContent>
            </Card>

            {(order!.status === "DRAFT" || (order!.status === "CONFIRMED" && !order!.hasInvoice)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {order!.status === "DRAFT" && (
                    <Button
                      onClick={() => {
                        setConfirming(true);
                        setConfirmWarehouseId("");
                      }}
                      className={cn("gap-1.5", BUTTON_PRESS)}
                    >
                      <Truck className="h-4 w-4" />
                      Confirm order
                    </Button>
                  )}
                  {order!.status === "CONFIRMED" && !order!.hasInvoice && (
                    <Button onClick={handleGenerateInvoice} disabled={submitting} className={cn("gap-1.5", BUTTON_PRESS)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Generate invoice
                    </Button>
                  )}
                  {order!.status === "DRAFT" && (
                    <Button variant="outline" onClick={() => setDeleting(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
                      <Trash2 className="h-4 w-4" />
                      Delete order
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Confirm order (choose warehouse) */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {order?.orderNumber}</DialogTitle>
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
            <Button variant="outline" onClick={() => setConfirming(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={submitting || !confirmWarehouseId} className={BUTTON_PRESS}>
              {submitting ? "Confirming…" : "Confirm & deduct stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete order */}
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {order?.orderNumber}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes the draft order.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Deleting…" : "Delete order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
