import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Eye, FileSpreadsheet, FileText, MoreHorizontal, Plus, RefreshCw, Search, Wallet } from "lucide-react";
import { Button, Card, CardContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, StatusBadge } from "@abms/ui";
import { inr, SortHeader, StatGrid } from "./purchase-helpers";
import { downloadCsv } from "./csv";
import type { SupplierBill } from "./types";

type SortKey = "billNumber" | "supplierName" | "amount" | "status" | "dueDate";

function urgencyOf(bill: SupplierBill): "High" | "Medium" | "Low" {
  if (bill.remaining <= 0.005) return "Low";
  const daysUntilDue = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysUntilDue < 0) return "High";
  if (daysUntilDue <= 7) return "Medium";
  return "Low";
}

const URGENCY_CLASS: Record<string, string> = {
  High: "bg-danger-bg text-danger",
  Medium: "bg-warning-bg text-warning",
  Low: "bg-success-bg text-success",
};

export function BillsTab({
  bills,
  loading,
  onNew,
  onRowClick,
  onRefetch,
}: {
  bills: SupplierBill[];
  loading: boolean;
  onNew: () => void;
  onRowClick: (bill: SupplierBill) => void;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const stats = useMemo(() => {
    const total = bills.length;
    const unpaid = bills.filter((b) => b.status === "UNPAID").length;
    const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
    const paidAmount = bills.reduce((sum, b) => sum + b.amountPaid, 0);
    const overdue = bills.filter((b) => b.status === "OVERDUE");
    const overdueAmount = overdue.reduce((sum, b) => sum + b.remaining, 0);
    return {
      total,
      unpaid,
      totalAmount,
      avgInvoice: total > 0 ? totalAmount / total : 0,
      paidAmount,
      paidPct: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      overdueCount: overdue.length,
      overdueAmount,
    };
  }, [bills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter((b) => b.billNumber.toLowerCase().includes(q) || b.supplierName.toLowerCase().includes(q) || (b.invoiceReference ?? "").toLowerCase().includes(q));
  }, [bills, search]);

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
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        case "dueDate":
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dirMul;
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

  function exportRows(list: SupplierBill[]) {
    const header = ["Invoice Number", "Supplier", "Invoice Reference", "Amount", "Paid", "Remaining", "Status", "Due Date", "Items"];
    const rows = list.map((b) => [b.billNumber, b.supplierName, b.invoiceReference ?? "", b.amount.toFixed(2), b.amountPaid.toFixed(2), b.remaining.toFixed(2), b.status, new Date(b.dueDate).toISOString().slice(0, 10), String(b.items.length)]);
    downloadCsv(`purchase-invoices-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  }

  const widgets = [
    { label: "Total Invoices", value: loading ? "—" : String(stats.total), icon: FileText, iconClass: "text-slate-500", footer: `${stats.unpaid} unpaid` },
    { label: "Total Amount", value: loading ? "—" : inr(stats.totalAmount), icon: Wallet, iconClass: "text-primary", footer: `${inr(stats.avgInvoice)} average invoice` },
    { label: "Paid Amount", value: loading ? "—" : inr(stats.paidAmount), icon: CheckCircle2, iconClass: "text-success", footer: `${stats.paidPct.toFixed(1)}% paid` },
    { label: "Overdue Amount", value: loading ? "—" : inr(stats.overdueAmount), icon: AlertTriangle, iconClass: "text-danger", footer: `${stats.overdueCount} overdue invoices` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage all your purchase invoices</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportRows(sorted)} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export Invoices
          </Button>
          <Button size="sm" onClick={onNew} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Create Purchase Invoice
          </Button>
        </div>
      </div>

      {showSummary && <StatGrid widgets={widgets} />}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search invoices by number, supplier, or reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No purchase invoices yet.</p>
              <Button size="sm" onClick={onNew} className="mt-1 gap-1.5">
                <Plus className="h-4 w-4" />
                Create your first invoice
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No invoices match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <SortHeader label="Invoice Number" k="billNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Supplier" k="supplierName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Amount" k="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 font-medium">Urgency</th>
                    <SortHeader label="Due Date" k="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => {
                    const urgency = urgencyOf(b);
                    return (
                      <tr key={b.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40" onClick={() => onRowClick(b)}>
                        <td className="px-4 py-2.5 font-mono text-xs text-primary">{b.billNumber}</td>
                        <td className="px-4 py-2.5">{b.supplierName}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="font-medium text-foreground">{inr(b.amount)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {b.items.length} item{b.items.length === 1 ? "" : "s"}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${URGENCY_CLASS[urgency]}`}>{urgency}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{new Date(b.dueDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onRowClick(b)}>
                                <Eye className="h-3.5 w-3.5" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportRows([b])}>
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Download CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
