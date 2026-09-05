import { useMemo, useRef, useState } from "react";
import {
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Upload,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  StatusBadge,
} from "@abms/ui";
import { inr, SortHeader, StatGrid } from "./purchase-helpers";
import { downloadCsv, parseCsv } from "./csv";
import type { PurchaseOrder, Supplier, Product } from "./types";

type SortKey = "poNumber" | "supplierName" | "createdAt" | "expectedDeliveryDate" | "items" | "total" | "status";

const IMPORT_HEADER = ["Supplier Code", "Expected Delivery Date", "Tracking Code", "Currency", "Payment Terms", "Items (SKU:Qty:UnitCost:HSN:UOM:Disc%:Tax%|...)"];

function itemsToCell(order: PurchaseOrder) {
  return order.items.map((i) => `${i.sku}:${i.quantity}:${i.unitCost}:${i.hsnSac ?? ""}:${i.uom}:${i.discountPct}:${i.taxPct}`).join("|");
}

export function OrdersTab({
  orders,
  suppliers,
  products,
  loading,
  onNew,
  onRowClick,
  onImportOne,
  onRefetch,
}: {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  loading: boolean;
  onNew: () => void;
  onRowClick: (po: PurchaseOrder) => void;
  onImportOne: (input: Record<string, unknown>) => Promise<void>;
  onRefetch: () => void;
}) {
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<{ ok: number; failed: Array<{ row: number; message: string }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const total = orders.length;
    const drafts = orders.filter((o) => o.status === "DRAFT").length;
    const pending = orders.filter((o) => o.status === "SENT");
    const approved = orders.filter((o) => o.status === "SENT" || o.status === "PARTIALLY_RECEIVED" || o.status === "RECEIVED");
    const received = orders.filter((o) => o.status === "RECEIVED");
    const totalValue = orders.reduce((sum, o) => sum + o.total, 0);
    const receivedValue = received.reduce((sum, o) => sum + o.total, 0);
    return {
      total,
      drafts,
      pendingCount: pending.length,
      pendingValue: pending.reduce((sum, o) => sum + o.total, 0),
      approvedCount: approved.length,
      receivedCount: received.length,
      totalValue,
      receivedValue,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) => o.poNumber.toLowerCase().includes(q) || o.supplierName.toLowerCase().includes(q) || o.trackingCode?.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "poNumber":
          return a.poNumber.localeCompare(b.poNumber) * dirMul;
        case "supplierName":
          return a.supplierName.localeCompare(b.supplierName) * dirMul;
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dirMul;
        case "expectedDeliveryDate":
          return ((a.expectedDeliveryDate ? new Date(a.expectedDeliveryDate).getTime() : 0) - (b.expectedDeliveryDate ? new Date(b.expectedDeliveryDate).getTime() : 0)) * dirMul;
        case "items":
          return (a.items.length - b.items.length) * dirMul;
        case "total":
          return (a.total - b.total) * dirMul;
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
      setSortDir("desc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((o) => o.id))));
  }

  function exportRows(list: PurchaseOrder[]) {
    const header = ["PO Number", "Supplier Code", "Expected Delivery Date", "Tracking Code", "Currency", "Payment Terms", "Items (SKU:Qty:UnitCost:HSN:UOM:Disc%:Tax%|...)"];
    const rows = list.map((o) => {
      const supplier = suppliers.find((s) => s.id === o.supplierId);
      return [
        o.poNumber,
        supplier?.code ?? "",
        o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toISOString().slice(0, 10) : "",
        o.trackingCode ?? "",
        o.currency ?? "INR",
        o.paymentTerms ?? "",
        itemsToCell(o),
      ];
    });
    downloadCsv(`purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  }

  function handleExportAll() {
    exportRows(sorted);
  }
  function handleExportOne(o: PurchaseOrder) {
    exportRows([o]);
  }
  function handleDownloadTemplate() {
    downloadCsv("purchase-orders-import-template.csv", [IMPORT_HEADER]);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const rows = parseCsv(text).filter((r) => r.length > 1 || r[0] !== "");
    const [, ...dataRows] = rows;
    setImportBusy(true);
    let ok = 0;
    const failed: Array<{ row: number; message: string }> = [];
    for (let idx = 0; idx < dataRows.length; idx++) {
      const cells = dataRows[idx];
      const rowNum = idx + 2;
      try {
        const [supplierCode, expectedDate, trackingCode, currency, paymentTerms, itemsCell] = cells;
        const supplier = suppliers.find((s) => s.code === supplierCode?.trim());
        if (!supplier) throw new Error(`Unknown supplier code "${supplierCode}"`);
        const itemEntries = (itemsCell ?? "").split("|").filter(Boolean);
        if (itemEntries.length === 0) throw new Error("No items in Items column");
        const items = itemEntries.map((entry) => {
          const [sku, qty, cost, hsn, uom, disc, tax] = entry.split(":");
          const product = products.find((p) => p.sku === sku?.trim());
          if (!product) throw new Error(`Unknown product SKU "${sku}"`);
          return {
            productId: product.id,
            hsnSac: hsn || undefined,
            quantity: Number(qty) || 1,
            uom: uom || "unit",
            unitCost: Number(cost) || 0,
            discountPct: Number(disc) || 0,
            taxPct: Number(tax) || 0,
          };
        });
        await onImportOne({
          supplierId: supplier.id,
          expectedDeliveryDate: expectedDate || undefined,
          trackingCode: trackingCode || undefined,
          currency: currency || "INR",
          paymentTerms: paymentTerms || undefined,
          items,
        });
        ok++;
      } catch (err) {
        failed.push({ row: rowNum, message: err instanceof Error ? err.message : "Failed to import row" });
      }
    }
    setImportBusy(false);
    setImportReport({ ok, failed });
    if (ok > 0) onRefetch();
  }

  const widgets = [
    { label: "Total Orders", value: loading ? "—" : String(stats.total), icon: ShoppingCart, iconClass: "text-slate-500", footer: `${stats.drafts} drafts` },
    { label: "Pending Orders", value: loading ? "—" : String(stats.pendingCount), icon: Clock, iconClass: "text-warning", footer: inr(stats.pendingValue) },
    { label: "Approved Orders", value: loading ? "—" : String(stats.approvedCount), icon: ShoppingCart, iconClass: "text-success", footer: `${stats.receivedCount} received` },
    { label: "Total Value", value: loading ? "—" : inr(stats.totalValue), icon: Wallet, iconClass: "text-primary", footer: `${inr(stats.receivedValue)} received` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Create and manage purchase orders for your suppliers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className="gap-1.5 text-xs">
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" onClick={onNew} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New Order
          </Button>
        </div>
      </div>

      {showSummary && <StatGrid widgets={widgets} />}

      <Card>
        <div className="border-b border-border px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Order List</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">View and manage your purchase orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 text-xs" placeholder="Search orders…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
              <Button size="sm" onClick={onNew} className="mt-1 gap-1.5">
                <Plus className="h-4 w-4" />
                Create your first order
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders match your search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <th className="w-9 px-4 py-2.5">
                      <Checkbox checked={selected.size > 0 && selected.size === sorted.length} onCheckedChange={toggleSelectAll} />
                    </th>
                    <SortHeader label="Order Number" k="poNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Supplier" k="supplierName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 font-medium">Tracking Code</th>
                    <SortHeader label="Order Date" k="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Expected Date" k="expectedDeliveryDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Items" k="items" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 font-medium">Currency</th>
                    <SortHeader label="Total" k="total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-2.5 font-medium">Payment</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((o) => {
                    const trackingCode = o.trackingCode;
                    const currency = o.currency ?? "INR";
                    const billStatus = o.billStatus;
                    return (
                      <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggleSelect(o.id)} />
                        </td>
                        <td className="cursor-pointer px-4 py-2.5 font-mono text-xs text-primary" onClick={() => onRowClick(o)}>
                          {o.poNumber}
                        </td>
                        <td className="cursor-pointer px-4 py-2.5" onClick={() => onRowClick(o)}>
                          {o.supplierName}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{trackingCode || "-"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{o.items.length}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{currency}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-foreground">{inr(o.total)}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-2.5">{billStatus ? <StatusBadge status={billStatus} /> : <span className="text-muted-foreground">No bill</span>}</td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onRowClick(o)}>
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportOne(o)}>
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

      {/* Import CSV */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          setImportOpen(o);
          if (!o) setImportReport(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import purchase orders</DialogTitle>
            <p className="text-sm text-muted-foreground">
              CSV columns: Supplier Code, Expected Delivery Date, Tracking Code, Currency, Payment Terms, Items. Each row creates one draft order.
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Download template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importBusy} className="w-full gap-1.5">
              <Upload className="h-4 w-4" />
              {importBusy ? "Importing…" : "Choose CSV file"}
            </Button>
            {importReport && (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium text-foreground">
                  {importReport.ok} order{importReport.ok === 1 ? "" : "s"} created
                  {importReport.failed.length > 0 ? `, ${importReport.failed.length} failed` : ""}
                </p>
                {importReport.failed.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-danger">
                    {importReport.failed.map((f) => (
                      <li key={f.row}>
                        Row {f.row}: {f.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
