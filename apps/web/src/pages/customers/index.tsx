import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Contact, Plus, Trash2 } from "lucide-react";
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

interface Customer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  creditLimit: number | null;
  paymentTerms: string | null;
  active: boolean;
  orderCount: number;
  createdAt: string;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

const CUSTOMERS_QUERY = gql`
  query Customers {
    customers {
      id
      code
      name
      email
      phone
      creditLimit
      paymentTerms
      active
      orderCount
      createdAt
    }
  }
`;

const CUSTOMER_ORDERS_QUERY = gql`
  query CustomerOrders($customerId: String!) {
    customerOrders(customerId: $customerId) {
      id
      orderNumber
      status
      total
      createdAt
    }
  }
`;

const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: String!) {
    deleteCustomer(id: $id)
  }
`;

export default function CustomersPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ customers: Customer[] }>(CUSTOMERS_QUERY);
  const [deleteCustomer] = useMutation(DELETE_CUSTOMER);

  const [detail, setDetail] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteCustomer({ variables: { id: deleteTarget.id } });
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDetail(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer");
    } finally {
      setSubmitting(false);
    }
  }

  const customers = data?.customers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Customer directory referenced by Sales orders and invoices.</p>
        </div>
        <Button size="sm" onClick={() => navigate("/customers/new")}>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All customers</CardTitle>
          <CardDescription>Click a row to view credit terms and order history.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : customers.length === 0 ? (
            <EmptyState onAdd={() => navigate("/customers/new")} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Code</th>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Phone</th>
                  <th className="py-2 font-medium">Credit limit</th>
                  <th className="py-2 font-medium">Orders</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                    onClick={() => setDetail(c)}
                  >
                    <td className="py-2 font-mono text-xs text-muted-foreground">{c.code}</td>
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="py-2 text-muted-foreground">{c.email || "—"}</td>
                    <td className="py-2 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="py-2">{c.creditLimit != null ? `$${c.creditLimit.toFixed(2)}` : "—"}</td>
                    <td className="py-2">
                      <Badge tone={c.orderCount > 0 ? "info" : "muted"}>{c.orderCount}</Badge>
                    </td>
                    <td className="py-2">
                      <Badge tone={c.active ? "success" : "muted"}>{c.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/edit/${c.id}`)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)}>
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
            <CustomerDetail
              customer={detail}
              onEdit={() => navigate(`/customers/edit/${detail.id}`)}
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
            This permanently removes the customer record. Customers with existing orders cannot be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting…" : "Delete customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerDetail({ customer, onEdit, onDelete }: { customer: Customer; onEdit: () => void; onDelete: () => void }) {
  const { data } = useQuery<{ customerOrders: OrderSummary[] }>(CUSTOMER_ORDERS_QUERY, {
    variables: { customerId: customer.id },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {customer.name}
          <Badge tone={customer.active ? "success" : "muted"}>{customer.active ? "Active" : "Inactive"}</Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Code</p>
          <p className="font-mono text-xs">{customer.code}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p>{customer.email || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Phone</p>
          <p>{customer.phone || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Credit limit</p>
          <p>{customer.creditLimit != null ? `$${customer.creditLimit.toFixed(2)}` : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Payment terms</p>
          <p>{customer.paymentTerms || "—"}</p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Order history</p>
        {!data?.customerOrders.length ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {data.customerOrders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-1.5 font-mono text-xs">{o.orderNumber}</td>
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
        <Contact className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No customers yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first customer.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first customer
      </Button>
    </div>
  );
}
