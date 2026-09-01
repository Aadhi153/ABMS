import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Factory, Plus, Trash2 } from "lucide-react";
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
  StatusBadge,
  toast,
} from "@abms/ui";

interface Supplier {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  paymentTerms: string | null;
  active: boolean;
  orderCount: number;
  createdAt: string;
}

interface PurchaseSummary {
  id: string;
  poNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

const SUPPLIERS_QUERY = gql`
  query Suppliers {
    suppliers {
      id
      code
      name
      email
      phone
      paymentTerms
      active
      orderCount
      createdAt
    }
  }
`;

const SUPPLIER_PURCHASES_QUERY = gql`
  query SupplierPurchases($supplierId: String!) {
    supplierPurchases(supplierId: $supplierId) {
      id
      poNumber
      status
      total
      createdAt
    }
  }
`;

const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($id: String!) {
    deleteSupplier(id: $id)
  }
`;

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ suppliers: Supplier[] }>(SUPPLIERS_QUERY);
  const [deleteSupplier] = useMutation(DELETE_SUPPLIER);

  const [detail, setDetail] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteSupplier({ variables: { id: deleteTarget.id } });
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete supplier");
    } finally {
      setSubmitting(false);
    }
  }

  const suppliers = data?.suppliers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Supplier directory referenced by Purchase orders and bills.</p>
        </div>
        <Button size="sm" onClick={() => navigate("/suppliers/new")}>
          <Plus className="h-4 w-4" />
          New Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All suppliers</CardTitle>
          <CardDescription>Click a row to view payment terms and purchase history.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : suppliers.length === 0 ? (
            <EmptyState onAdd={() => navigate("/suppliers/new")} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Code</th>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Phone</th>
                  <th className="py-2 font-medium">Payment terms</th>
                  <th className="py-2 font-medium">Orders</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                    onClick={() => setDetail(s)}
                  >
                    <td className="py-2 font-mono text-xs text-muted-foreground">{s.code}</td>
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2 text-muted-foreground">{s.email || "—"}</td>
                    <td className="py-2 text-muted-foreground">{s.phone || "—"}</td>
                    <td className="py-2 text-muted-foreground">{s.paymentTerms || "—"}</td>
                    <td className="py-2">
                      <Badge tone={s.orderCount > 0 ? "info" : "muted"}>{s.orderCount}</Badge>
                    </td>
                    <td className="py-2">
                      <Badge tone={s.active ? "success" : "muted"}>{s.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/suppliers/edit/${s.id}`)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Detail panel */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <SupplierDetail
              supplier={detail}
              onEdit={() => navigate(`/suppliers/edit/${detail.id}`)}
              onDelete={() => setDeleteTarget(detail)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes the supplier record. Suppliers with existing orders cannot be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting…" : "Delete supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupplierDetail({ supplier, onEdit, onDelete }: { supplier: Supplier; onEdit: () => void; onDelete: () => void }) {
  const { data } = useQuery<{ supplierPurchases: PurchaseSummary[] }>(SUPPLIER_PURCHASES_QUERY, {
    variables: { supplierId: supplier.id },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {supplier.name}
          <Badge tone={supplier.active ? "success" : "muted"}>{supplier.active ? "Active" : "Inactive"}</Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Code</p>
          <p className="font-mono text-xs">{supplier.code}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p>{supplier.email || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Phone</p>
          <p>{supplier.phone || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Payment terms</p>
          <p>{supplier.paymentTerms || "—"}</p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Purchase history</p>
        {!data?.supplierPurchases.length ? (
          <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {data.supplierPurchases.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 font-mono text-xs">{o.poNumber}</td>
                  <td className="py-1.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-1.5 text-right">${o.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button onClick={onEdit}>Edit</Button>
      </DialogFooter>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Factory className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No suppliers yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first supplier.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first supplier
      </Button>
    </div>
  );
}
