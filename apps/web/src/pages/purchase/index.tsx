import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { FileMinus, Send, Trash2, Wallet } from "lucide-react";
import {
  Button,
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
import { ModulePlaceholder } from "../../components/module-placeholder";
import { inr } from "./purchase-helpers";
import { OrdersTab } from "./orders-tab";
import { GrnTab } from "./grn-tab";
import { BillsTab } from "./bills-tab";
import { OutstandingTab } from "./outstanding-tab";
import { SupplierPaymentsTab } from "./supplier-payments-tab";
import { PaymentApprovalsTab } from "./payment-approvals-tab";
import { DebitNotesTab } from "./debit-notes-tab";
import type { DebitNote, Grn, Product, PurchaseOrder, Supplier, SupplierBill, SupplierPayment, Warehouse } from "./types";

const TABS = [
  { key: "orders" },
  { key: "receipts" },
  { key: "bills" },
  { key: "debitnotes" },
  { key: "outstanding" },
  { key: "paymentapprovals" },
  { key: "supplierpayments" },
] as const;

const BASE_QUERY = gql`
  query PurchasePageData {
    purchaseOrders {
      id
      poNumber
      status
      supplierId
      supplierName
      expectedDeliveryDate
      trackingCode
      currency
      paymentTerms
      taxMethod
      supplierNotes
      termsConditions
      internalNotes
      supplierAddress { line1 line2 city state postalCode country }
      deliveryAddress { line1 line2 city state postalCode country }
      createdByName
      shippingAmount
      subtotal
      discountAmount
      taxAmount
      total
      hasBill
      billStatus
      createdAt
      items {
        id
        productId
        productName
        sku
        hsnSac
        quantity
        uom
        unitCost
        discountPct
        taxPct
        warehouseId
        warehouseName
        receivedQuantity
        lineTotal
      }
    }
    goodsReceivedNotes {
      id
      grnNumber
      purchaseOrderId
      poNumber
      supplierId
      supplierName
      warehouseId
      warehouseName
      receivedByName
      status
      qualityScore
      taxId
      bankAccountId
      bankAccountName
      taxMethod
      supplierNotes
      termsConditions
      internalNotes
      vendorAddress { line1 line2 city state postalCode country }
      deliveryAddress { line1 line2 city state postalCode country }
      shippingAmount
      subtotal
      discountAmount
      taxAmount
      total
      createdAt
      items {
        id
        purchaseOrderItemId
        productId
        productName
        sku
        hsnSac
        orderedQuantity
        quantityReceived
        acceptedQuantity
        rejectedQuantity
        batchNumber
        unitPrice
        discountPct
        taxPct
        warehouseId
        warehouseName
        lineTotal
      }
    }
    supplierBills {
      id
      billNumber
      supplierId
      supplierName
      purchaseOrderId
      poNumber
      invoiceReference
      invoiceDate
      paymentTerms
      taxMethod
      supplierNotes
      termsConditions
      internalNotes
      billingAddress { line1 line2 city state postalCode country }
      shippingAddress { line1 line2 city state postalCode country }
      shippingAmount
      subtotal
      discountAmount
      taxAmount
      amount
      amountPaid
      amountDebited
      remaining
      status
      dueDate
      createdAt
      items {
        id
        productId
        productName
        sku
        hsnSac
        quantity
        uom
        unitCost
        discountPct
        taxPct
        warehouseId
        warehouseName
        lineTotal
      }
    }
    supplierPayments {
      id
      billId
      billNumber
      supplierId
      supplierName
      amount
      method
      reference
      status
      requestedById
      requestedByName
      approvedById
      approvedByName
      paidAt
      resolvedAt
      createdAt
    }
    debitNotes {
      id
      debitNoteNumber
      billId
      billNumber
      supplierId
      supplierName
      type
      status
      warehouseId
      warehouseName
      issueDate
      dueDate
      linkedDocId
      taxId
      settlementAccountId
      settlementAccountName
      taxMethod
      supplierNotes
      termsConditions
      internalNotes
      partnerAddress { line1 line2 city state postalCode country }
      grossAmount
      discountAmount
      taxAmount
      amount
      reason
      voidedAt
      createdAt
      items {
        id
        productId
        productName
        sku
        quantity
        uom
        unitPrice
        discountPct
        taxPct
        lineTotal
      }
    }
    suppliers {
      id
      code
      name
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
const DELETE_PO = gql`
  mutation DeletePurchaseOrder($id: String!) {
    deletePurchaseOrder(id: $id)
  }
`;
const RECORD_SUPPLIER_PAYMENT = gql`
  mutation RecordSupplierPayment($input: RecordSupplierPaymentInput!) {
    recordSupplierPayment(input: $input) {
      id
    }
  }
`;
const APPROVE_SUPPLIER_PAYMENT = gql`
  mutation ApproveSupplierPayment($id: String!) {
    approveSupplierPayment(id: $id) {
      id
    }
  }
`;
const REJECT_SUPPLIER_PAYMENT = gql`
  mutation RejectSupplierPayment($id: String!) {
    rejectSupplierPayment(id: $id) {
      id
    }
  }
`;
const VOID_DEBIT_NOTE = gql`
  mutation VoidDebitNote($id: String!) {
    voidDebitNote(id: $id) {
      id
    }
  }
`;

const DEFERRED_SEGMENTS: Record<string, string> = {
  requisitions: "Purchase Requisitions",
};

export default function PurchasePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const deferredTitle = DEFERRED_SEGMENTS[segment];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "orders";

  useEffect(() => {
    if (!deferredTitle && !TABS.some((t) => t.key === segment)) {
      navigate(`/purchase/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate, deferredTitle]);

  const { data, loading, refetch } = useQuery<{
    purchaseOrders: PurchaseOrder[];
    goodsReceivedNotes: Grn[];
    supplierBills: SupplierBill[];
    supplierPayments: SupplierPayment[];
    debitNotes: DebitNote[];
    suppliers: Supplier[];
    products: Product[];
    warehouses: Warehouse[];
  }>(BASE_QUERY);

  const [createPo] = useMutation(CREATE_PO, { refetchQueries: ["PurchasePageData"] });
  const [sendPo] = useMutation(SEND_PO);
  const [deletePo] = useMutation(DELETE_PO);
  const [recordSupplierPayment] = useMutation(RECORD_SUPPLIER_PAYMENT);
  const [approveSupplierPayment] = useMutation(APPROVE_SUPPLIER_PAYMENT);
  const [rejectSupplierPayment] = useMutation(REJECT_SUPPLIER_PAYMENT);
  const [voidDebitNote] = useMutation(VOID_DEBIT_NOTE);

  const [poDetail, setPoDetail] = useState<PurchaseOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [grnDetail, setGrnDetail] = useState<Grn | null>(null);
  const [billDetail, setBillDetail] = useState<SupplierBill | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<SupplierBill | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const orders = data?.purchaseOrders ?? [];
  const grns = data?.goodsReceivedNotes ?? [];
  const bills = data?.supplierBills ?? [];
  const payments = data?.supplierPayments ?? [];
  const debitNotes = data?.debitNotes ?? [];
  const products = data?.products ?? [];

  const outstandingBills = bills.filter((b) => b.remaining > 0.005).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const totalOutstanding = outstandingBills.reduce((sum, b) => sum + b.remaining, 0);
  const pendingPayments = payments.filter((p) => p.status === "PENDING").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  function findBill(billId: string) {
    return bills.find((b) => b.id === billId) ?? null;
  }

  async function handleSend(po: PurchaseOrder) {
    setSubmitting(true);
    try {
      await sendPo({ variables: { id: po.id } });
      toast.success(`${po.poNumber} sent to supplier`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deletePo({ variables: { id: deleteTarget.id } });
      toast.success(`${deleteTarget.poNumber} deleted`);
      setDeleteTarget(null);
      setPoDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprovePayment(payment: SupplierPayment) {
    setSubmitting(true);
    try {
      await approveSupplierPayment({ variables: { id: payment.id } });
      toast.success(`Payment for ${payment.billNumber} approved`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve payment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectPayment(payment: SupplierPayment) {
    setSubmitting(true);
    try {
      await rejectSupplierPayment({ variables: { id: payment.id } });
      toast.success(`Payment for ${payment.billNumber} rejected`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject payment");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCreateReturn(grn: Grn) {
    const bill = bills.find((b) => b.purchaseOrderId === grn.purchaseOrderId);
    if (!bill) {
      toast.error(`No purchase invoice yet for ${grn.poNumber} — create one before issuing a return.`);
      return;
    }
    setGrnDetail(null);
    navigate(`/purchase/debitnotes/new?billId=${bill.id}`);
  }

  async function handleVoidDebitNote(note: DebitNote) {
    setSubmitting(true);
    try {
      await voidDebitNote({ variables: { id: note.id } });
      toast.success(`${note.debitNoteNumber} voided`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void debit note");
    } finally {
      setSubmitting(false);
    }
  }

  if (deferredTitle) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase</h1>
          <p className="text-sm text-muted-foreground">Purchase orders, goods receipt, and supplier bills.</p>
        </div>
        <ModulePlaceholder title={deferredTitle} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tab === "orders" && (
        <OrdersTab
          orders={orders}
          suppliers={data?.suppliers ?? []}
          products={products}
          loading={loading}
          onNew={() => navigate("/purchase/new")}
          onRowClick={setPoDetail}
          onImportOne={async (input) => {
            await createPo({ variables: { input } });
          }}
          onRefetch={refetch}
        />
      )}

      {tab === "receipts" && (
        <GrnTab
          grns={grns}
          loading={loading}
          onRowClick={setGrnDetail}
          onCreateReturn={handleCreateReturn}
          onRefetch={refetch}
        />
      )}

      {tab === "bills" && (
        <BillsTab
          bills={bills}
          loading={loading}
          onNew={() => navigate("/purchase/bills/new")}
          onRowClick={setBillDetail}
          onRefetch={refetch}
        />
      )}

      {tab === "debitnotes" && (
        <DebitNotesTab
          debitNotes={debitNotes}
          loading={loading}
          onRowClick={(note) => { const b = findBill(note.billId); if (b) setBillDetail(b); }}
          onVoid={handleVoidDebitNote}
          submitting={submitting}
          onRefetch={refetch}
        />
      )}

      {tab === "outstanding" && (
        <OutstandingTab
          outstandingBills={outstandingBills}
          totalOutstanding={totalOutstanding}
          loading={loading}
          onRowClick={setBillDetail}
          onRefetch={refetch}
        />
      )}

      {tab === "paymentapprovals" && (
        <PaymentApprovalsTab
          pendingPayments={pendingPayments}
          loading={loading}
          submitting={submitting}
          onApprove={handleApprovePayment}
          onReject={handleRejectPayment}
          onRowClick={(p) => { const b = findBill(p.billId); if (b) setBillDetail(b); }}
          onRefetch={refetch}
        />
      )}

      {tab === "supplierpayments" && (
        <SupplierPaymentsTab
          payments={payments}
          loading={loading}
          onRowClick={(p) => { const b = findBill(p.billId); if (b) setBillDetail(b); }}
          onRefetch={refetch}
        />
      )}

      {/* PO detail */}
      <Dialog open={!!poDetail} onOpenChange={(o) => !o && setPoDetail(null)}>
        <DialogContent className="max-w-lg">
          {poDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {poDetail.poNumber}
                  <StatusBadge status={poDetail.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p>{poDetail.supplierName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected delivery</p>
                  <p>{poDetail.expectedDeliveryDate ? new Date(poDetail.expectedDeliveryDate).toLocaleDateString() : "—"}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1.5 font-medium">Product</th>
                    <th className="py-1.5 font-medium text-right">Ordered</th>
                    <th className="py-1.5 font-medium text-right">Received</th>
                    <th className="py-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {poDetail.items.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0">
                      <td className="py-1.5">{i.productName}</td>
                      <td className="py-1.5 text-right">{i.quantity}</td>
                      <td className="py-1.5 text-right">{i.receivedQuantity}</td>
                      <td className="py-1.5 text-right">{inr(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm">
                <div className="flex justify-end gap-3 text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{inr(poDetail.subtotal)}</span>
                </div>
                {poDetail.discountAmount > 0 && (
                  <div className="flex justify-end gap-3 text-muted-foreground">
                    <span>Discount:</span>
                    <span className="text-danger">-{inr(poDetail.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-end gap-3 text-muted-foreground">
                  <span>Tax:</span>
                  <span>{inr(poDetail.taxAmount)}</span>
                </div>
                <div className="flex justify-end gap-3 font-semibold text-foreground">
                  <span>Total:</span>
                  <span>{inr(poDetail.total)}</span>
                </div>
              </div>
              <DialogFooter>
                {poDetail.status === "DRAFT" && (
                  <>
                    <Button variant="outline" onClick={() => setDeleteTarget(poDetail)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                    <Button onClick={() => handleSend(poDetail)}>
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </>
                )}
                {(poDetail.status === "SENT" || poDetail.status === "PARTIALLY_RECEIVED") && (
                  <Button onClick={() => navigate(`/purchase/orders/${poDetail.id}/receive`)}>Receive goods</Button>
                )}
                {poDetail.status === "RECEIVED" && !poDetail.hasBill && (
                  <Button onClick={() => navigate(`/purchase/bills/new?poId=${poDetail.id}`)}>Create bill</Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete PO */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.poNumber}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes the draft purchase order.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting…" : "Delete order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRN detail */}
      <Dialog open={!!grnDetail} onOpenChange={(o) => !o && setGrnDetail(null)}>
        <DialogContent className="max-w-lg">
          {grnDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {grnDetail.grnNumber}
                  <StatusBadge status={grnDetail.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p>{grnDetail.supplierName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Purchase order</p>
                  <p className="font-mono text-xs">{grnDetail.poNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p>{grnDetail.warehouseName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quality score</p>
                  <p>{grnDetail.qualityScore}%</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1.5 font-medium">Product</th>
                    <th className="py-1.5 font-medium text-right">Accepted</th>
                    <th className="py-1.5 font-medium text-right">Rejected</th>
                    <th className="py-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grnDetail.items.map((i) => (
                    <tr key={i.id} className="border-b border-border last:border-0">
                      <td className="py-1.5">{i.productName}</td>
                      <td className="py-1.5 text-right text-success">{i.acceptedQuantity}</td>
                      <td className="py-1.5 text-right text-danger">{i.rejectedQuantity}</td>
                      <td className="py-1.5 text-right">{inr(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end text-sm font-medium">Total: {inr(grnDetail.total)}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleCreateReturn(grnDetail)}>
                  <FileMinus className="h-4 w-4" />
                  Create Return
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill detail */}
      <Dialog open={!!billDetail} onOpenChange={(o) => !o && setBillDetail(null)}>
        <DialogContent>
          {billDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {billDetail.billNumber}
                  <StatusBadge status={billDetail.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p>{billDetail.supplierName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due date</p>
                  <p>{new Date(billDetail.dueDate).toLocaleDateString()}</p>
                </div>
                {billDetail.invoiceReference && (
                  <div>
                    <p className="text-muted-foreground">Invoice reference</p>
                    <p>{billDetail.invoiceReference}</p>
                  </div>
                )}
                {billDetail.poNumber && (
                  <div>
                    <p className="text-muted-foreground">Purchase order</p>
                    <p className="font-mono text-xs">{billDetail.poNumber}</p>
                  </div>
                )}
              </div>
              {billDetail.items.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1.5 font-medium">Product</th>
                      <th className="py-1.5 font-medium text-right">Qty</th>
                      <th className="py-1.5 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billDetail.items.map((i) => (
                      <tr key={i.id} className="border-b border-border last:border-0">
                        <td className="py-1.5">{i.productName}</td>
                        <td className="py-1.5 text-right">{i.quantity}</td>
                        <td className="py-1.5 text-right">{inr(i.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-end gap-3 text-muted-foreground">
                  <span>Bill amount:</span>
                  <span>{inr(billDetail.amount)}</span>
                </div>
                <div className="flex justify-end gap-3 text-muted-foreground">
                  <span>Paid:</span>
                  <span>{inr(billDetail.amountPaid)}</span>
                </div>
                <div className="flex justify-end gap-3 text-muted-foreground">
                  <span>Debited:</span>
                  <span>{inr(billDetail.amountDebited)}</span>
                </div>
                <div className="flex justify-end gap-3 font-semibold text-foreground">
                  <span>Remaining:</span>
                  <span>{inr(billDetail.remaining)}</span>
                </div>
              </div>
              <DialogFooter>
                {billDetail.remaining > 0.005 && (
                  <>
                    <Button variant="outline" onClick={() => navigate(`/purchase/debitnotes/new?billId=${billDetail.id}`)}>
                      <FileMinus className="h-4 w-4" />
                      Create debit note
                    </Button>
                    <Button onClick={() => setPaymentTarget(billDetail)}>
                      <Wallet className="h-4 w-4" />
                      Record payment
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record payment (goes to approval queue) */}
      <Dialog open={!!paymentTarget} onOpenChange={(o) => !o && setPaymentTarget(null)}>
        <DialogContent>
          {paymentTarget && (
            <RecordPaymentForm
              bill={paymentTarget}
              submitting={submitting}
              onSubmit={async (amount, method, reference) => {
                setSubmitting(true);
                try {
                  await recordSupplierPayment({ variables: { input: { billId: paymentTarget.id, amount, method, reference } } });
                  toast.success(`Payment submitted for approval — ${paymentTarget.billNumber}`);
                  setPaymentTarget(null);
                  setBillDetail(null);
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


const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

function RecordPaymentForm({
  bill,
  onSubmit,
  submitting,
}: {
  bill: SupplierBill;
  onSubmit: (amount: number, method: string, reference: string | undefined) => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState(String(bill.remaining.toFixed(2)));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return;
        onSubmit(Number(amount), method, reference || undefined);
      }}
    >
      <DialogHeader>
        <DialogTitle>Record payment — {bill.billNumber}</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Submitted for admin approval before it counts toward the bill. Remaining balance: {inr(bill.remaining)}.
        </p>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>Amount</Label>
        <Input type="number" step="0.01" min="0.01" max={bill.remaining} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Payment method</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Reference (optional)</Label>
        <Input placeholder="Transaction ID, cheque number…" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting || !amount}>
          {submitting ? "Submitting…" : "Submit for approval"}
        </Button>
      </DialogFooter>
    </form>
  );
}


