import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import { BarChart3, Boxes, ShoppingCart, Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@abms/ui";
import { BarChart, type BarDatum } from "../../components/charts/bar-chart";

const TABS = [{ key: "sales" }, { key: "inventory" }, { key: "purchase" }, { key: "financial" }] as const;
const QUERY = gql`
  query ReportsPageData {
    invoices {
      id
      customerName
      total
    }
    products {
      id
      category
      totalStock
      reorderThreshold
      active
    }
    purchaseOrders {
      id
      supplierName
      subtotal
    }
    profitAndLoss {
      revenue
      costOfGoods
      operatingExpenses
      netProfit
    }
  }
`;

function groupSum<T>(rows: T[], key: (r: T) => string, value: (r: T) => number) {
  const map = new Map<string, { total: number; count: number }>();
  for (const row of rows) {
    const k = key(row);
    const entry = map.get(k) ?? { total: 0, count: 0 };
    entry.total += value(row);
    entry.count += 1;
    map.set(k, entry);
  }
  return [...map.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.total - a.total);
}

export default function ReportsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "sales";

  useEffect(() => {
    if (!TABS.some((t) => t.key === segment)) {
      navigate(`/reports/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate]);

  const { data, loading } = useQuery<{
    invoices: Array<{ id: string; customerName: string; total: number }>;
    products: Array<{ id: string; category: string | null; totalStock: number; reorderThreshold: number; active: boolean }>;
    purchaseOrders: Array<{ id: string; supplierName: string; subtotal: number }>;
    profitAndLoss: { revenue: number; costOfGoods: number; operatingExpenses: number; netProfit: number };
  }>(QUERY);

  const revenueByCustomer = useMemo(
    () => groupSum(data?.invoices ?? [], (i) => i.customerName, (i) => i.total),
    [data?.invoices],
  );
  const stockByCategory = useMemo(
    () =>
      groupSum(
        (data?.products ?? []).filter((p) => p.active),
        (p) => p.category ?? "Uncategorized",
        (p) => p.totalStock,
      ),
    [data?.products],
  );
  const lowStockByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data?.products ?? []) {
      if (!p.active || p.totalStock > p.reorderThreshold) continue;
      const k = p.category ?? "Uncategorized";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [data?.products]);
  const spendBySupplier = useMemo(
    () => groupSum(data?.purchaseOrders ?? [], (o) => o.supplierName, (o) => o.subtotal),
    [data?.purchaseOrders],
  );
  const pnl = data?.profitAndLoss;
  const pnlBars: BarDatum[] = pnl
    ? [
        { label: "Revenue", value: pnl.revenue, colorVar: "--success" },
        { label: "COGS", value: pnl.costOfGoods, colorVar: "--warning" },
        { label: "Expenses", value: pnl.operatingExpenses, colorVar: "--danger" },
        { label: "Net profit", value: Math.max(0, pnl.netProfit), colorVar: "--primary" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground">Cross-module reports rendered from live database records.</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && tab === "sales" && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by customer</CardTitle>
            <CardDescription>Invoice totals grouped by customer, from real Sales data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {revenueByCustomer.length === 0 ? (
              <EmptyReport icon={ShoppingCart} label="No invoices yet." />
            ) : (
              <>
                <BarChart data={revenueByCustomer.map((r) => ({ label: r.label, value: r.total }))} colorVar="--primary" formatValue={(v) => `$${v.toFixed(0)}`} />
                <ReportTable
                  columns={["Customer", "Invoices", "Revenue"]}
                  rows={revenueByCustomer.map((r) => [r.label, String(r.count), `$${r.total.toFixed(2)}`])}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && tab === "inventory" && (
        <Card>
          <CardHeader>
            <CardTitle>Stock by category</CardTitle>
            <CardDescription>Units on hand per product category, from real Inventory data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stockByCategory.length === 0 ? (
              <EmptyReport icon={Boxes} label="No products yet." />
            ) : (
              <>
                <BarChart data={stockByCategory.map((r) => ({ label: r.label, value: r.total }))} colorVar="--info" formatValue={(v) => `${v} units`} />
                <ReportTable
                  columns={["Category", "Products", "Units on hand", "Low stock"]}
                  rows={stockByCategory.map((r) => [r.label, String(r.count), String(r.total), String(lowStockByCategory.get(r.label) ?? 0)])}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && tab === "purchase" && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase spend by supplier</CardTitle>
            <CardDescription>Purchase order totals grouped by supplier, from real Purchase data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {spendBySupplier.length === 0 ? (
              <EmptyReport icon={Truck} label="No purchase orders yet." />
            ) : (
              <>
                <BarChart data={spendBySupplier.map((r) => ({ label: r.label, value: r.total }))} colorVar="--warning" formatValue={(v) => `$${v.toFixed(0)}`} />
                <ReportTable
                  columns={["Supplier", "Orders", "Total spend"]}
                  rows={spendBySupplier.map((r) => [r.label, String(r.count), `$${r.total.toFixed(2)}`])}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && tab === "financial" && pnl && (
        <Card>
          <CardHeader>
            <CardTitle>Profit &amp; Loss breakdown</CardTitle>
            <CardDescription>Computed from real ledger entries posted by Sales and Purchase activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarChart data={pnlBars} formatValue={(v) => `$${v.toFixed(0)}`} />
            <ReportTable
              columns={["Line", "Amount"]}
              rows={[
                ["Revenue", `$${pnl.revenue.toFixed(2)}`],
                ["Cost of goods", `-$${pnl.costOfGoods.toFixed(2)}`],
                ["Operating expenses", `-$${pnl.operatingExpenses.toFixed(2)}`],
                ["Net profit", `$${pnl.netProfit.toFixed(2)}`],
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {columns.map((c, i) => (
              <th key={c} className={`py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className={`py-1.5 ${ci > 0 ? "text-right" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyReport({ icon: Icon, label }: { icon: typeof BarChart3; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
