import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ClipboardList, FileText, PackageCheck, Plus, Send, Trash2 } from "lucide-react";
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
import { ModulePlaceholder } from "../../components/module-placeholder";

const TABS = [{ key: "orders" }, { key: "receipts" }, { key: "bills" }] as const;
interface Supplier {
  id: string;
  name: string;
}
interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
}
interface Warehouse {
  id: string;
  name: string;
}
interface PoItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
  lineTotal: number;
}
interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  supplierId: string;
  supplierName: string;
  expectedDeliveryDate: string | null;
  createdByName: string;
  items: PoItem[];
  subtotal: number;
  hasBill: boolean;
  createdAt: string;
}
interface Grn {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  warehouseName: string;
  receivedByName: string;
  items: Array<{ id: string; productName: string; quantityReceived: number }>;
  createdAt: string;
}
interface SupplierBill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  poNumber: string | null;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
}

const BASE_QUERY = gql`
  query PurchasePageData {
    purchaseOrders {
      id
      poNumber
      status
      supplierId
      supplierName
      expectedDeliveryDate
      createdByName
      subtotal
      hasBill
      createdAt
      items {
        id
        productId
        productName
        sku
        quantity
        unitCost
        receivedQuantity
        lineTotal
      }
    }
    goodsReceivedNotes {
      id
      grnNumber
      purchaseOrderId
      poNumber
      warehouseName
      receivedByName
      createdAt
      items {
        id
        productName
        quantityReceived
      }
    }
    supplierBills {
      id
      billNumber
      supplierId
      supplierName
      purchaseOrderId
      poNumber
      amount
      status
      dueDate
      createdAt
    }
    suppliers {
      id
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
const CREATE_GRN = gql`
  mutation CreateGrn($input: CreateGrnInput!) {
    createGrn(input: $input) {
      id
    }
  }
`;
const CREATE_BILL = gql`
  mutation CreateSupplierBill($input: CreateSupplierBillInput!) {
    createSupplierBill(input: $input) {
      id
    }
  }
`;
const UPDATE_BILL_STATUS = gql`
  mutation UpdateSupplierBillStatus($id: String!, $status: String!) {
    updateSupplierBillStatus(id: $id, status: $status) {
      id
    }
  }
`;

type WizardItem = { productId: string; quantity: number; unitCost: number };

const DEFERRED_SEGMENTS: Record<string, string> = {
  requisitions: "Purchase Requisitions",
  debitnotes: "Debit Notes",
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
    suppliers: Supplier[];
    products: Product[];
    warehouses: Warehouse[];
  }>(BASE_QUERY);

  const [createPo] = useMutation(CREATE_PO);
  const [sendPo] = useMutation(SEND_PO);
  const [deletePo] = useMutation(DELETE_PO);
  const [createGrn] = useMutation(CREATE_GRN);
  const [createBill] = useMutation(CREATE_BILL);
  const [updateBillStatus] = useMutation(UPDATE_BILL_STATUS);

  const [createOpen, setCreateOpen] = useState(false);
  const [poDetail, setPoDetail] = useState<PurchaseOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrder | null>(null);
  const [billFor, setBillFor] = useState<PurchaseOrder | null>(null);
  const [billDetail, setBillDetail] = useState<SupplierBill | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const orders = data?.purchaseOrders ?? [];
  const grns = data?.goodsReceivedNotes ?? [];
  const bills = data?.supplierBills ?? [];
  const suppliers = data?.suppliers ?? [];
  const products = data?.products ?? [];
  const warehouses = data?.warehouses ?? [];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase</h1>
          <p className="text-sm text-muted-foreground">Purchase orders, goods receipt, and supplier bills.</p>
        </div>
        {tab === "orders" && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        )}
      </div>

      {tab === "orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase orders</CardTitle>
            <CardDescription>Click a row to view items, send, receive stock, or create a bill.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : orders.length === 0 ? (
              <EmptyState label="purchase order" onAdd={() => setCreateOpen(true)} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">PO #</th>
                    <th className="py-2 font-medium">Supplier</th>
                    <th className="py-2 font-medium">Items</th>
                    <th className="py-2 font-medium">Subtotal</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr
                      key={po.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                      onClick={() => setPoDetail(po)}
                    >
                      <td className="py-2 font-mono text-xs">{po.poNumber}</td>
                      <td className="py-2">{po.supplierName}</td>
                      <td className="py-2 text-muted-foreground">{po.items.length}</td>
                      <td className="py-2">${po.subtotal.toFixed(2)}</td>
                      <td className="py-2">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        {po.status === "DRAFT" && (
                          <Button variant="ghost" size="sm" onClick={() => handleSend(po)}>
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {(po.status === "SENT" || po.status === "PARTIALLY_RECEIVED") && (
                          <Button variant="ghost" size="sm" onClick={() => setReceiveTarget(po)}>
                            Receive
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

      {tab === "receipts" && (
        <Card>
          <CardHeader>
            <CardTitle>Goods received notes</CardTitle>
            <CardDescription>Every confirmed receipt adds stock back into Inventory.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : grns.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <PackageCheck className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No goods received yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">GRN #</th>
                    <th className="py-2 font-medium">PO #</th>
                    <th className="py-2 font-medium">Warehouse</th>
                    <th className="py-2 font-medium">Items received</th>
                    <th className="py-2 font-medium">Received by</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((g) => (
                    <tr key={g.id} className="border-b border-border last:border-0">
                      <td className="py-2 font-mono text-xs">{g.grnNumber}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{g.poNumber}</td>
                      <td className="py-2">{g.warehouseName}</td>
                      <td className="py-2 text-muted-foreground">{g.items.reduce((s, i) => s + i.quantityReceived, 0)} units</td>
                      <td className="py-2">{g.receivedByName}</td>
                      <td className="py-2 text-muted-foreground">{new Date(g.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "bills" && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier bills</CardTitle>
            <CardDescription>Click a row to update payment status.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : bills.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No supplier bills yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Bill #</th>
                    <th className="py-2 font-medium">PO #</th>
                    <th className="py-2 font-medium">Supplier</th>
                    <th className="py-2 font-medium">Amount</th>
                    <th className="py-2 font-medium">Due</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr
                      key={b.id}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                      onClick={() => setBillDetail(b)}
                    >
                      <td className="py-2 font-mono text-xs">{b.billNumber}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{b.poNumber || "—"}</td>
                      <td className="py-2">{b.supplierName}</td>
                      <td className="py-2">${b.amount.toFixed(2)}</td>
                      <td className="py-2 text-muted-foreground">{new Date(b.dueDate).toLocaleDateString()}</td>
                      <td className="py-2">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {createOpen && (
        <CreatePoDialog
          suppliers={suppliers}
          products={products}
          submitting={submitting}
          onClose={() => setCreateOpen(false)}
          onCreate={async (supplierId, expectedDeliveryDate, items) => {
            setSubmitting(true);
            try {
              await createPo({ variables: { input: { supplierId, expectedDeliveryDate: expectedDeliveryDate || undefined, items } } });
              toast.success("Purchase order created");
              setCreateOpen(false);
              await refetch();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to create purchase order");
            } finally {
              setSubmitting(false);
            }
          }}
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
                      <td className="py-1.5 text-right">${i.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end text-sm font-medium">Subtotal: ${poDetail.subtotal.toFixed(2)}</div>
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
                  <Button onClick={() => setReceiveTarget(poDetail)}>Receive goods</Button>
                )}
                {poDetail.status === "RECEIVED" && !poDetail.hasBill && (
                  <Button onClick={() => setBillFor(poDetail)}>Create bill</Button>
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

      {/* Receive goods */}
      <Dialog open={!!receiveTarget} onOpenChange={(o) => !o && setReceiveTarget(null)}>
        <DialogContent className="max-w-lg">
          {receiveTarget && (
            <ReceiveGoodsForm
              po={receiveTarget}
              warehouses={warehouses}
              submitting={submitting}
              onSubmit={async (warehouseId, items) => {
                setSubmitting(true);
                try {
                  await createGrn({ variables: { input: { purchaseOrderId: receiveTarget.id, warehouseId, items } } });
                  toast.success(`Stock received for ${receiveTarget.poNumber}`);
                  setReceiveTarget(null);
                  setPoDetail(null);
                  await refetch();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to record receipt");
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create bill */}
      <Dialog open={!!billFor} onOpenChange={(o) => !o && setBillFor(null)}>
        <DialogContent>
          {billFor && (
            <CreateBillForm
              po={billFor}
              submitting={submitting}
              onSubmit={async (amount, dueDate) => {
                setSubmitting(true);
                try {
                  await createBill({ variables: { input: { supplierId: billFor.supplierId, purchaseOrderId: billFor.id, amount, dueDate } } });
                  toast.success(`Bill created for ${billFor.poNumber}`);
                  setBillFor(null);
                  setPoDetail(null);
                  await refetch();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to create bill");
                } finally {
                  setSubmitting(false);
                }
              }}
            />
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
                  <p className="text-muted-foreground">Amount</p>
                  <p>${billDetail.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due date</p>
                  <p>{new Date(billDetail.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PO</p>
                  <p className="font-mono text-xs">{billDetail.poNumber || "—"}</p>
                </div>
              </div>
              <DialogFooter>
                {["UNPAID", "PARTIAL", "PAID"].map((s) => (
                  <Button
                    key={s}
                    variant={billDetail.status === s ? "default" : "outline"}
                    size="sm"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await updateBillStatus({ variables: { id: billDetail.id, status: s } });
                        toast.success(`${billDetail.billNumber} marked ${s.toLowerCase()}`);
                        setBillDetail(null);
                        await refetch();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to update bill");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    Mark {s.toLowerCase()}
                  </Button>
                ))}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePoDialog({
  suppliers,
  products,
  onClose,
  onCreate,
  submitting,
}: {
  suppliers: Supplier[];
  products: Product[];
  onClose: () => void;
  onCreate: (supplierId: string, expectedDeliveryDate: string, items: WizardItem[]) => void;
  submitting: boolean;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [items, setItems] = useState<WizardItem[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  function addItem() {
    const product = products.find((p) => p.id === productId);
    if (!product || !quantity) return;
    setItems((prev) => [...prev, { productId: product.id, quantity: Number(quantity), unitCost: product.costPrice }]);
    setProductId("");
    setQuantity("1");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expected delivery</Label>
              <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (${p.costPrice.toFixed(2)})
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
                        {it.quantity} × ${it.unitCost.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right">${(it.quantity * it.unitCost).toFixed(2)}</td>
                      <td className="py-1.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
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
            <Button
              disabled={submitting || !supplierId || items.length === 0}
              onClick={() => onCreate(supplierId, expectedDeliveryDate, items)}
            >
              {submitting ? "Creating…" : "Create purchase order"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveGoodsForm({
  po,
  warehouses,
  onSubmit,
  submitting,
}: {
  po: PurchaseOrder;
  warehouses: Warehouse[];
  onSubmit: (warehouseId: string, items: Array<{ purchaseOrderItemId: string; quantityReceived: number }>) => void;
  submitting: boolean;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const outstanding = po.items.filter((i) => i.receivedQuantity < i.quantity);
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(outstanding.map((i) => [i.id, String(i.quantity - i.receivedQuantity)])),
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const items = outstanding
      .map((i) => ({ purchaseOrderItemId: i.id, quantityReceived: Number(quantities[i.id] || 0) }))
      .filter((i) => i.quantityReceived > 0);
    if (items.length === 0 || !warehouseId) return;
    onSubmit(warehouseId, items);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Receive goods — {po.poNumber}</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>Receiving warehouse</Label>
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1.5 font-medium">Product</th>
            <th className="py-1.5 font-medium text-right">Outstanding</th>
            <th className="py-1.5 font-medium text-right">Receive now</th>
          </tr>
        </thead>
        <tbody>
          {outstanding.map((i) => (
            <tr key={i.id} className="border-b border-border last:border-0">
              <td className="py-1.5">{i.productName}</td>
              <td className="py-1.5 text-right text-muted-foreground">{i.quantity - i.receivedQuantity}</td>
              <td className="py-1.5 text-right">
                <Input
                  className="ml-auto w-24"
                  type="number"
                  min="0"
                  max={i.quantity - i.receivedQuantity}
                  value={quantities[i.id] ?? ""}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [i.id]: e.target.value }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <DialogFooter>
        <Button type="submit" disabled={submitting || !warehouseId}>
          {submitting ? "Recording…" : "Confirm receipt"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CreateBillForm({
  po,
  onSubmit,
  submitting,
}: {
  po: PurchaseOrder;
  onSubmit: (amount: number, dueDate: string) => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState(String(po.subtotal.toFixed(2)));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amount || !dueDate) return;
        onSubmit(Number(amount), dueDate);
      }}
    >
      <DialogHeader>
        <DialogTitle>Create bill — {po.poNumber}</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>Amount</Label>
        <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Due date</Label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create bill"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
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
