import { useMemo, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, Search, Wallet, XCircle } from "lucide-react";
import { Card, CardContent, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from "@abms/ui";
import { inr, SortHeader, StatGrid } from "./purchase-helpers";
import type { SupplierPayment } from "./types";

type SortKey = "billNumber" | "supplierName" | "amount" | "method" | "status" | "paidAt";

export function SupplierPaymentsTab({
  payments,
  loading,
  onRowClick,
  onRefetch,
}: {
  payments: SupplierPayment[];
  loading: boolean;
  onRowClick: (payment: SupplierPayment) => void;
  onRefetch: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("paidAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const stats = useMemo(() => {
    const approved = payments.filter((p) => p.status === "APPROVED");
    const pending = payments.filter((p) => p.status === "PENDING");
    const rejected = payments.filter((p) => p.status === "REJECTED");
    return {
      totalPaid: approved.reduce((sum, p) => sum + p.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
      rejectedCount: rejected.length,
    };
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return p.billNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q) || (p.reference ?? "").toLowerCase().includes(q);
    });
  }, [payments, search, statusFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "billNumber":
          return a.billNumber.localeCompare(b.billNumber) * dirMul;
        case "supplierName":
          return a.supplierName.localeCompare(b.supplierName) * dirMul;
        case "amount":
          return (a.amount - b.amount) * dirMul;
        case "method":
          return a.method.localeCompare(b.method) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
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
      setSortKey(k as SortKey);
      setSortDir("desc");
    }
  }

  const widgets = [
    { label: "Total Paid", value: loading ? "—" : inr(stats.totalPaid), icon: CheckCircle2, iconClass: "text-emerald-500", footer: "Approved payments" },
    { label: "Pending Approval", value: loading ? "—" : String(stats.pendingCount), icon: Clock, iconClass: "text-warning", footer: inr(stats.pendingAmount) },
    { label: "Rejected", value: loading ? "—" : String(stats.rejectedCount), icon: XCircle, iconClass: "text-danger", footer: "Not applied to bill" },
    { label: "Total Requests", value: loading ? "—" : String(payments.length), icon: Wallet, iconClass: "text-slate-500", footer: "All-time" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Supplier Payments</h1>
        <p className="text-sm text-muted-foreground">Every payment requested against a supplier bill, and its approval status.</p>
      </div>

      <StatGrid widgets={widgets} />

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Click a row to view the related bill. Start a payment from Purchase Invoices.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search by bill, supplier, or reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No supplier payments recorded yet.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No payments match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <SortHeader label="Bill #" k="billNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Supplier" k="supplierName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Amount" k="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Method" k="method" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 font-medium">Requested by</th>
                    <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Date" k="paidAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40" onClick={() => onRowClick(p)}>
                      <td className="px-4 py-2.5 font-mono text-xs text-primary">{p.billNumber}</td>
                      <td className="px-4 py-2.5">{p.supplierName}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">{inr(p.amount)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.method.replaceAll("_", " ")}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.requestedByName}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(p.paidAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
