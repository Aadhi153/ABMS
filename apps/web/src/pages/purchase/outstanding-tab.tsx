import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, FileText, RefreshCw, Search, Wallet } from "lucide-react";
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge } from "@abms/ui";
import { inr, SortHeader, StatGrid } from "./purchase-helpers";
import type { SupplierBill } from "./types";

interface OutstandingEntry extends SupplierBill {
  remaining: number;
}

type SortKey = "billNumber" | "supplierName" | "amount" | "amountPaid" | "remaining" | "dueDate" | "status";

export function OutstandingTab({
  outstandingBills,
  totalOutstanding,
  loading,
  onRowClick,
  onRefetch,
}: {
  outstandingBills: OutstandingEntry[];
  totalOutstanding: number;
  loading: boolean;
  onRowClick: (bill: SupplierBill) => void;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [dueFilter, setDueFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const isOverdue = (b: OutstandingEntry) => new Date(b.dueDate).getTime() < Date.now();

  const stats = useMemo(() => {
    const total = outstandingBills.length;
    const overdue = outstandingBills.filter(isOverdue);
    const overdueAmount = overdue.reduce((sum, b) => sum + b.remaining, 0);
    const avg = total > 0 ? totalOutstanding / total : 0;
    return { total, overdueCount: overdue.length, overdueAmount, avg };
  }, [outstandingBills, totalOutstanding]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outstandingBills.filter((b) => {
      if (dueFilter === "overdue" && !isOverdue(b)) return false;
      if (dueFilter === "upcoming" && isOverdue(b)) return false;
      if (!q) return true;
      return b.billNumber.toLowerCase().includes(q) || b.supplierName.toLowerCase().includes(q);
    });
  }, [outstandingBills, search, dueFilter]);

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
        case "amountPaid":
          return (a.amountPaid - b.amountPaid) * dirMul;
        case "remaining":
          return (a.remaining - b.remaining) * dirMul;
        case "dueDate":
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(k: string) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k as SortKey);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const widgets = [
    { label: "Outstanding Bills", value: loading ? "—" : String(stats.total), icon: FileText, iconClass: "text-slate-500", footer: "Awaiting payment" },
    { label: "Total Outstanding", value: loading ? "—" : inr(totalOutstanding), icon: Wallet, iconClass: "text-primary", footer: "Remaining balance" },
    { label: "Overdue", value: loading ? "—" : String(stats.overdueCount), icon: AlertTriangle, iconClass: "text-danger", footer: "Past due date" },
    { label: "Overdue Amount", value: loading ? "—" : inr(stats.overdueAmount), icon: Clock, iconClass: "text-danger", footer: "Needs attention" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase Outstanding</h1>
          <p className="text-sm text-muted-foreground">Supplier bills with a remaining balance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
          {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSummary ? "Hide Summary" : "Show Summary"}
        </Button>
      </div>

      {showSummary && <StatGrid widgets={widgets} />}

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Outstanding Bills</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Click a row to record a payment or debit note.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search by bill # or supplier…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <Select value={dueFilter} onValueChange={(v) => { setDueFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : outstandingBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nothing outstanding — all bills are fully paid.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No bills match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Bill #" k="billNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Supplier" k="supplierName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Amount" k="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Paid" k="amountPaid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Remaining" k="remaining" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                      <SortHeader label="Due" k="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((b) => (
                      <tr key={b.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40" onClick={() => onRowClick(b)}>
                        <td className="px-4 py-2.5 font-mono text-xs text-primary">{b.billNumber}</td>
                        <td className="px-4 py-2.5">{b.supplierName}</td>
                        <td className="px-4 py-2.5 text-right">{inr(b.amount)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{inr(b.amountPaid)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-foreground">{inr(b.remaining)}</td>
                        <td className={"px-4 py-2.5 " + (isOverdue(b) ? "font-medium text-danger" : "text-muted-foreground")}>
                          {new Date(b.dueDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
