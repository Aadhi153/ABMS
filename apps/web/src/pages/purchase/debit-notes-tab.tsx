import { useMemo, useState } from "react";
import { Ban, Download, Eye, FileMinus, MoreHorizontal, RefreshCw, RotateCcw, Search, TrendingUp, Wallet } from "lucide-react";
import { Button, Card, CardContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, StatusBadge, cn } from "@abms/ui";
import { inr, SortHeader, StatGrid } from "./purchase-helpers";
import { downloadCsv } from "./csv";
import type { DebitNote } from "./types";

type SortKey = "debitNoteNumber" | "billNumber" | "supplierName" | "amount" | "status" | "issueDate";

const TYPE_LABEL: Record<string, string> = {
  PURCHASE_RETURN: "Purchase Return",
  SUPPLIER_DEBIT: "Supplier Debit",
  OTHER: "Other",
};

export function DebitNotesTab({
  debitNotes,
  loading,
  onRowClick,
  onVoid,
  submitting,
  onRefetch,
}: {
  debitNotes: DebitNote[];
  loading: boolean;
  onRowClick: (note: DebitNote) => void;
  onVoid: (note: DebitNote) => void;
  submitting: boolean;
  onRefetch: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("issueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const stats = useMemo(() => {
    const active = debitNotes.filter((d) => d.status !== "VOIDED");
    const voided = debitNotes.filter((d) => d.status === "VOIDED").length;
    const returns = active.filter((d) => d.type === "PURCHASE_RETURN");
    const returnedUnits = returns.reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.quantity, 0), 0);
    const now = new Date();
    const thisMonth = active
      .filter((d) => {
        const dt = new Date(d.issueDate);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      })
      .reduce((sum, d) => sum + d.amount, 0);
    return {
      total: debitNotes.length,
      voided,
      totalValue: active.reduce((sum, d) => sum + d.amount, 0),
      returnsCount: returns.length,
      returnedUnits,
      thisMonth,
    };
  }, [debitNotes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return debitNotes;
    return debitNotes.filter((d) => d.debitNoteNumber.toLowerCase().includes(q) || d.billNumber.toLowerCase().includes(q) || d.supplierName.toLowerCase().includes(q));
  }, [debitNotes, search]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "debitNoteNumber":
          return a.debitNoteNumber.localeCompare(b.debitNoteNumber) * dirMul;
        case "billNumber":
          return a.billNumber.localeCompare(b.billNumber) * dirMul;
        case "supplierName":
          return a.supplierName.localeCompare(b.supplierName) * dirMul;
        case "amount":
          return (a.amount - b.amount) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        case "issueDate":
          return (new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()) * dirMul;
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

  function handleExport() {
    const header = ["Debit Note #", "Type", "Supplier", "Bill #", "Amount", "Status", "Issue Date", "Reason"];
    const rows = sorted.map((d) => [d.debitNoteNumber, TYPE_LABEL[d.type] ?? d.type, d.supplierName, d.billNumber, d.amount.toFixed(2), d.status, new Date(d.issueDate).toISOString().slice(0, 10), d.reason]);
    downloadCsv(`debit-notes-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  }

  const widgets = [
    { label: "Total Notes", value: loading ? "—" : String(stats.total), icon: FileMinus, iconClass: "text-slate-500", footer: `${stats.voided} voided` },
    { label: "Total Value", value: loading ? "—" : inr(stats.totalValue), icon: Wallet, iconClass: "text-primary", footer: "Active debit notes combined" },
    { label: "Purchase Returns", value: loading ? "—" : String(stats.returnsCount), icon: RotateCcw, iconClass: "text-warning", footer: `${stats.returnedUnits} units returned` },
    { label: "This Month", value: loading ? "—" : inr(stats.thisMonth), icon: TrendingUp, iconClass: "text-success", footer: new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Debit Notes</h1>
          <p className="text-sm text-muted-foreground">Manage debit notes for purchase returns and adjustments</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      <StatGrid widgets={widgets} />

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Debit Notes</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Click a row to view the related bill. Start a debit note from Purchase Invoices.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search debit notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : debitNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FileMinus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No debit notes issued yet.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No debit notes match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <SortHeader label="Debit Note #" k="debitNoteNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <SortHeader label="Supplier" k="supplierName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Bill #" k="billNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Amount" k="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Issue Date" k="issueDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((d) => (
                    <tr key={d.id} className={cn("border-b border-border last:border-0 hover:bg-muted/40", d.status === "VOIDED" && "opacity-60")}>
                      <td className="cursor-pointer px-4 py-2.5 font-mono text-xs text-primary" onClick={() => onRowClick(d)}>
                        {d.debitNoteNumber}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">{TYPE_LABEL[d.type] ?? d.type}</span>
                      </td>
                      <td className="cursor-pointer px-4 py-2.5" onClick={() => onRowClick(d)}>
                        {d.supplierName}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{d.billNumber}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">{inr(d.amount)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{new Date(d.issueDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onRowClick(d)}>
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </DropdownMenuItem>
                            {d.status !== "VOIDED" && (
                              <DropdownMenuItem onClick={() => onVoid(d)} disabled={submitting} className="text-danger focus:text-danger">
                                <Ban className="h-3.5 w-3.5" />
                                Void Note
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
