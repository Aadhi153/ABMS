import { gql, useQuery } from "@apollo/client";
import { AlertTriangle, Landmark, RefreshCw, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button, Card, CardContent } from "@abms/ui";

const QUERY = gql`
  query DashboardSummary {
    deals {
      id
      stage
    }
    lowStockProducts {
      id
    }
    salesOrders {
      id
      status
    }
    receivables {
      totalOwed
    }
    payables {
      totalOwed
    }
    ledgerEntries {
      id
      type
      amount
      postedAt
    }
  }
`;

const COLORS = {
  amber: { badge: "bg-primary-bg text-primary", footer: "text-muted-foreground" },
  red: { badge: "bg-danger-bg text-danger", footer: "text-danger" },
  green: { badge: "bg-success-bg text-success", footer: "text-success" },
  blue: { badge: "bg-info-bg text-info", footer: "text-muted-foreground" },
} as const;

function isToday(date: string) {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function DashboardPage() {
  const { data, loading, refetch } = useQuery<{
    deals: Array<{ id: string; stage: string }>;
    lowStockProducts: Array<{ id: string }>;
    salesOrders: Array<{ id: string; status: string }>;
    receivables: Array<{ totalOwed: number }>;
    payables: Array<{ totalOwed: number }>;
    ledgerEntries: Array<{ id: string; type: string; amount: number; postedAt: string }>;
  }>(QUERY);

  const openDeals = data?.deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST").length ?? 0;
  const lowStock = data?.lowStockProducts.length ?? 0;
  const openOrders = data?.salesOrders.filter((o) => o.status !== "CANCELLED" && o.status !== "DELIVERED").length ?? 0;
  const receivablesTotal = data?.receivables.reduce((s, r) => s + r.totalOwed, 0) ?? 0;
  const payablesTotal = data?.payables.reduce((s, p) => s + p.totalOwed, 0) ?? 0;
  const revenueToday =
    data?.ledgerEntries
      .filter((e) => e.type === "RECEIVABLE" && isToday(e.postedAt))
      .reduce((s, e) => s + e.amount, 0) ?? 0;

  const WIDGETS = [
    {
      label: "Open Deals",
      value: loading ? "—" : String(openDeals),
      icon: Users,
      color: COLORS.amber,
      footer: "All-time",
    },
    {
      label: "Low Stock Items",
      value: loading ? "—" : String(lowStock),
      icon: AlertTriangle,
      color: COLORS.red,
      footer: "⚠ Needs attention",
    },
    {
      label: "Revenue Today",
      value: loading ? "—" : `$${revenueToday.toFixed(2)}`,
      icon: TrendingUp,
      color: COLORS.green,
      footer: "● Live",
    },
    {
      label: "Receivables",
      value: loading ? "—" : `$${receivablesTotal.toFixed(2)}`,
      icon: Landmark,
      color: COLORS.blue,
      footer: "Outstanding",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live data from your ABMS database.</p>
        </div>
        <Button size="sm" disabled={loading} onClick={() => void refetch()} className="rounded-full">
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WIDGETS.map((w) => (
          <Card key={w.label} className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{w.label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${w.color.badge}`}>
                  <w.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-foreground">{w.value}</div>
              <div className={`text-xs ${w.color.footer}`}>{w.footer}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-l-4 border-l-info">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-info-bg text-info">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${openDeals} open deal${openDeals === 1 ? "" : "s"}, ${lowStock} product${lowStock === 1 ? "" : "s"} below reorder threshold, ${openOrders} order${openOrders === 1 ? "" : "s"} awaiting fulfillment or invoicing, $${payablesTotal.toFixed(2)} owed to suppliers.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
