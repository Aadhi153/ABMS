import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Download, Eye, MoreHorizontal, PackageCheck, RefreshCw, RotateCcw, Search, Wallet } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  StatusBadge,
} from "@abms/ui";
import { inr, SortHeader, StatGrid } from "./purchase-helpers";
import { downloadCsv } from "./csv";
import type { Grn } from "./types";

type SortKey = "grnNumber" | "poNumber" | "supplierName" | "warehouseName" | "createdAt" | "status" | "total";

export function GrnTab({
  grns,
  loading,
  onRowClick,
  onCreateReturn,
  onRefetch,
}: {
  grns: Grn[];
  loading: boolean;
  onRowClick: (grn: Grn) => void;
  onCreateReturn: (grn: Grn) => void;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const stats = useMemo(() => {
    const total = grns.length;
    const drafts = grns.filter((g) => g.status === "DRAFT").length;
    const received = grns.filter((g) => g.status === "COMPLETED");
    const totalValue = grns.reduce((sum, g) => sum + g.total, 0);
    const acceptedValue = received.reduce((sum, g) => sum + g.total, 0);
    const avgQuality = total > 0 ? Math.round(grns.reduce((sum, g) => sum + g.qualityScore, 0) / total) : 0;
    return { total, drafts, receivedCount: received.length, totalValue, acceptedValue, avgQuality };
  }, [grns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grns;
    return grns.filter((g) => g.grnNumber.toLowerCase().includes(q) || g.poNumber.toLowerCase().includes(q) || g.supplierName.toLowerCase().includes(q));
  }, [grns, search]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "grnNumber":
          return a.grnNumber.localeCompare(b.grnNumber) * dirMul;
        case "poNumber":
          return a.poNumber.localeCompare(b.poNumber) * dirMul;
        case "supplierName":
          return a.supplierName.localeCompare(b.supplierName) * dirMul;
        case "warehouseName":
          return a.warehouseName.localeCompare(b.warehouseName) * dirMul;
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dirMul;
        case "status":
          return a.status.localeCompare(b.status) * dirMul;
        case "total":
          return (a.total - b.total) * dirMul;
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
    const header = ["GRN Number", "PO Number", "Supplier", "Warehouse", "Received Date", "Status", "Quality Score", "Accepted Units", "Rejected Units", "Total Amount"];
    const rows = sorted.map((g) => {
      const accepted = g.items.reduce((sum, i) => sum + i.acceptedQuantity, 0);
      const rejected = g.items.reduce((sum, i) => sum + i.rejectedQuantity, 0);
      return [g.grnNumber, g.poNumber, g.supplierName, g.warehouseName, new Date(g.createdAt).toISOString().slice(0, 10), g.status, String(g.qualityScore), String(accepted), String(rejected), g.total.toFixed(2)];
    });
    downloadCsv(`goods-received-notes-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  }

  const widgets = [
    { label: "Total GRNs", value: loading ? "—" : String(stats.total), icon: PackageCheck, iconClass: "text-slate-500", footer: `${stats.drafts} drafts` },
    { label: "Received", value: loading ? "—" : String(stats.receivedCount), icon: Clock, iconClass: "text-warning", footer: "Completed receipts" },
    { label: "Avg. Quality", value: loading ? "—" : `${stats.avgQuality}%`, icon: CheckCircle2, iconClass: "text-success", footer: "Quality approved" },
    { label: "Total Value", value: loading ? "—" : inr(stats.totalValue), icon: Wallet, iconClass: "text-primary", footer: `${inr(stats.acceptedValue)} completed` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Goods Received Notes</h1>
          <p className="text-sm text-muted-foreground">Manage goods received from suppliers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {showSummary && <StatGrid widgets={widgets} />}

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Receipt List</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Every confirmed receipt adds accepted stock back into Inventory.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search by GRN number, PO number, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : grns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <PackageCheck className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No goods received yet.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No receipts match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <SortHeader label="GRN Number" k="grnNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="PO Number" k="poNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Supplier" k="supplierName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Warehouse" k="warehouseName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Received Date" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 font-medium">Quality</th>
                    <th className="px-4 py-2.5 font-medium">Items</th>
                    <SortHeader label="Total Amount" k="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((g) => {
                    const accepted = g.items.reduce((sum, i) => sum + i.acceptedQuantity, 0);
                    const rejected = g.items.reduce((sum, i) => sum + i.rejectedQuantity, 0);
                    return (
                      <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="cursor-pointer px-4 py-2.5 font-mono text-xs text-primary" onClick={() => onRowClick(g)}>
                          {g.grnNumber}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{g.poNumber}</td>
                        <td className="px-4 py-2.5">{g.supplierName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{g.warehouseName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{new Date(g.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={g.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-info">Quality: {g.qualityScore}%</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="text-success">Accepted: {accepted}</span>
                          {rejected > 0 && <span className="ml-1.5 text-danger">Rejected: {rejected}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-foreground">{inr(g.total)}</td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onRowClick(g)}>
                                <Eye className="h-3.5 w-3.5" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onCreateReturn(g)}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Create Return
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
