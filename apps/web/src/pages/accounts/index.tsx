import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { BookOpen, Landmark, PiggyBank, Plus, Receipt, Trash2, TrendingUp } from "lucide-react";
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
  Input,
  Label,
  toast,
} from "@abms/ui";

const TABS = [
  { key: "ledger", label: "Ledger", icon: BookOpen },
  { key: "receivables", label: "Receivables", icon: TrendingUp },
  { key: "payables", label: "Payables", icon: Landmark },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "pnl", label: "P&L", icon: PiggyBank },
] as const;
interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  description: string;
  postedAt: string;
}
interface Aging {
  current: number;
  days31to60: number;
  days60plus: number;
}
interface Receivable {
  customerId: string;
  customerName: string;
  totalOwed: number;
  aging: Aging;
  invoiceCount: number;
}
interface Payable {
  supplierId: string;
  supplierName: string;
  totalOwed: number;
  aging: Aging;
  billCount: number;
}
interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes: string | null;
  createdByName: string;
}
interface Pnl {
  revenue: number;
  costOfGoods: number;
  operatingExpenses: number;
  netProfit: number;
}
interface InvoiceLite {
  id: string;
  invoiceNumber: string;
  customerId: string;
  status: string;
  total: number;
  amountPaid: number;
  dueDate: string;
}
interface BillLite {
  id: string;
  billNumber: string;
  supplierId: string;
  status: string;
  amount: number;
  dueDate: string;
}

const QUERY = gql`
  query AccountsPageData {
    ledgerEntries {
      id
      type
      amount
      description
      postedAt
    }
    receivables {
      customerId
      customerName
      totalOwed
      invoiceCount
      aging {
        current
        days31to60
        days60plus
      }
    }
    payables {
      supplierId
      supplierName
      totalOwed
      billCount
      aging {
        current
        days31to60
        days60plus
      }
    }
    expenses {
      id
      category
      amount
      date
      notes
      createdByName
    }
    profitAndLoss {
      revenue
      costOfGoods
      operatingExpenses
      netProfit
    }
    invoices {
      id
      invoiceNumber
      customerId
      status
      total
      amountPaid
      dueDate
    }
    supplierBills {
      id
      billNumber
      supplierId
      status
      amount
      dueDate
    }
  }
`;

const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
    }
  }
`;

const DELETE_EXPENSE = gql`
  mutation DeleteExpense($id: String!) {
    deleteExpense(id: $id)
  }
`;

const TYPE_TONE: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  RECEIVABLE: "info",
  PAYABLE: "warning",
  EXPENSE: "danger",
  REVENUE: "success",
};

export default function AccountsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "ledger";

  useEffect(() => {
    if (!TABS.some((t) => t.key === segment)) {
      navigate(`/accounts/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate]);

  const { data, loading, refetch } = useQuery<{
    ledgerEntries: LedgerEntry[];
    receivables: Receivable[];
    payables: Payable[];
    expenses: Expense[];
    profitAndLoss: Pnl;
    invoices: InvoiceLite[];
    supplierBills: BillLite[];
  }>(QUERY);
  const [receivableDetail, setReceivableDetail] = useState<Receivable | null>(null);
  const [payableDetail, setPayableDetail] = useState<Payable | null>(null);
  const [createExpense] = useMutation(CREATE_EXPENSE);
  const [deleteExpense] = useMutation(DELETE_EXPENSE);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleDeleteExpense() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteExpense({ variables: { id: deleteTarget.id } });
      toast.success(`${deleteTarget.category} expense deleted`);
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createExpense({
        variables: {
          input: { category: form.category, amount: Number(form.amount), date: form.date, notes: form.notes || undefined },
        },
      });
      toast.success("Expense recorded");
      setExpenseOpen(false);
      setForm({ category: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  }

  const ledger = data?.ledgerEntries ?? [];
  const receivables = data?.receivables ?? [];
  const payables = data?.payables ?? [];
  const expenses = data?.expenses ?? [];
  const pnl = data?.profitAndLoss;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">Ledger, receivables, payables, expenses, and P&amp;L — all from real transactions.</p>
        </div>
        {tab === "expenses" && (
          <Button size="sm" onClick={() => setExpenseOpen(true)}>
            <Plus className="h-4 w-4" />
            New Expense
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(`/accounts/${t.key}`)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "ledger" && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction ledger</CardTitle>
            <CardDescription>Auto-posted from invoices, supplier bills, and expenses — not manually entered.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : ledger.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Description</th>
                    <th className="py-2 font-medium text-right">Amount</th>
                    <th className="py-2 font-medium text-right">Posted</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="py-2">
                        <Badge tone={TYPE_TONE[e.type] ?? "muted"}>{e.type}</Badge>
                      </td>
                      <td className="py-2">{e.description}</td>
                      <td className="py-2 text-right">${e.amount.toFixed(2)}</td>
                      <td className="py-2 text-right text-muted-foreground">{new Date(e.postedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "receivables" && (
        <Card>
          <CardHeader>
            <CardTitle>Receivables aging</CardTitle>
            <CardDescription>Customers with unpaid invoice balances, computed from real invoice + payment data.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : receivables.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nothing outstanding — all invoices are paid.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Customer</th>
                    <th className="py-2 font-medium text-right">0–30 days</th>
                    <th className="py-2 font-medium text-right">31–60 days</th>
                    <th className="py-2 font-medium text-right">60+ days</th>
                    <th className="py-2 font-medium text-right">Total owed</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => (
                    <tr
                      key={r.customerId}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                      onClick={() => setReceivableDetail(r)}
                    >
                      <td className="py-2">
                        {r.customerName} <span className="text-muted-foreground">({r.invoiceCount})</span>
                      </td>
                      <td className="py-2 text-right">${r.aging.current.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        {r.aging.days31to60 > 0 ? <Badge tone="warning">${r.aging.days31to60.toFixed(2)}</Badge> : "$0.00"}
                      </td>
                      <td className="py-2 text-right">
                        {r.aging.days60plus > 0 ? <Badge tone="danger">${r.aging.days60plus.toFixed(2)}</Badge> : "$0.00"}
                      </td>
                      <td className="py-2 text-right font-medium">${r.totalOwed.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "payables" && (
        <Card>
          <CardHeader>
            <CardTitle>Payables aging</CardTitle>
            <CardDescription>Suppliers with unpaid bills, computed from real supplier bill data.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : payables.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Landmark className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nothing outstanding — all bills are paid.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Supplier</th>
                    <th className="py-2 font-medium text-right">0–30 days</th>
                    <th className="py-2 font-medium text-right">31–60 days</th>
                    <th className="py-2 font-medium text-right">60+ days</th>
                    <th className="py-2 font-medium text-right">Total owed</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p) => (
                    <tr
                      key={p.supplierId}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                      onClick={() => setPayableDetail(p)}
                    >
                      <td className="py-2">
                        {p.supplierName} <span className="text-muted-foreground">({p.billCount})</span>
                      </td>
                      <td className="py-2 text-right">${p.aging.current.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        {p.aging.days31to60 > 0 ? <Badge tone="warning">${p.aging.days31to60.toFixed(2)}</Badge> : "$0.00"}
                      </td>
                      <td className="py-2 text-right">
                        {p.aging.days60plus > 0 ? <Badge tone="danger">${p.aging.days60plus.toFixed(2)}</Badge> : "$0.00"}
                      </td>
                      <td className="py-2 text-right font-medium">${p.totalOwed.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "expenses" && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Manual expense entries, posted to the ledger automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Receipt className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
                <Button size="sm" onClick={() => setExpenseOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add your first expense
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 font-medium">Category</th>
                    <th className="py-2 font-medium">Notes</th>
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Recorded by</th>
                    <th className="py-2 font-medium text-right">Amount</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="py-2">{e.category}</td>
                      <td className="py-2 text-muted-foreground">{e.notes || "—"}</td>
                      <td className="py-2 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="py-2">{e.createdByName}</td>
                      <td className="py-2 text-right">${e.amount.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(e)}>
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
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.category} expense?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This removes the expense and its ledger entry.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense} disabled={submitting}>
              {submitting ? "Deleting…" : "Delete expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tab === "pnl" && pnl && (
        <Card>
          <CardHeader>
            <CardTitle>Profit &amp; Loss</CardTitle>
            <CardDescription>Computed from ledger entries: revenue (receivables posted), cost of goods (payables posted), and expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2">Revenue</td>
                  <td className="py-2 text-right text-success">${pnl.revenue.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2">Cost of goods (purchases)</td>
                  <td className="py-2 text-right text-danger">-${pnl.costOfGoods.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2">Operating expenses</td>
                  <td className="py-2 text-right text-danger">-${pnl.operatingExpenses.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-semibold">Net profit</td>
                  <td className={`py-2 text-right font-semibold ${pnl.netProfit >= 0 ? "text-success" : "text-danger"}`}>
                    ${pnl.netProfit.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Receivable detail */}
      <Dialog open={!!receivableDetail} onOpenChange={(o) => !o && setReceivableDetail(null)}>
        <DialogContent>
          {receivableDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{receivableDetail.customerName} — outstanding invoices</DialogTitle>
              </DialogHeader>
              <table className="w-full text-sm">
                <tbody>
                  {(data?.invoices ?? [])
                    .filter((inv) => inv.customerId === receivableDetail.customerId && inv.status !== "PAID")
                    .map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <td className="py-1.5 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="py-1.5">
                          <Badge tone="muted">{inv.status}</Badge>
                        </td>
                        <td className="py-1.5 text-right">${(inv.total - inv.amountPaid).toFixed(2)} due</td>
                        <td className="py-1.5 text-right text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payable detail */}
      <Dialog open={!!payableDetail} onOpenChange={(o) => !o && setPayableDetail(null)}>
        <DialogContent>
          {payableDetail && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{payableDetail.supplierName} — outstanding bills</DialogTitle>
              </DialogHeader>
              <table className="w-full text-sm">
                <tbody>
                  {(data?.supplierBills ?? [])
                    .filter((b) => b.supplierId === payableDetail.supplierId && b.status !== "PAID")
                    .map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0">
                        <td className="py-1.5 font-mono text-xs">{b.billNumber}</td>
                        <td className="py-1.5">
                          <Badge tone="muted">{b.status}</Badge>
                        </td>
                        <td className="py-1.5 text-right">${b.amount.toFixed(2)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{new Date(b.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New expense</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="e-category">Category</Label>
              <Input
                id="e-category"
                required
                placeholder="e.g. Rent, Utilities, Software"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-amount">Amount</Label>
                <Input
                  id="e-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-date">Date</Label>
                <Input id="e-date" type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-notes">Notes</Label>
              <Input id="e-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Record expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
