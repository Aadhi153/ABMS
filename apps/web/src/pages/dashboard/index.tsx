import { gql, useQuery } from "@apollo/client";
import { Boxes, Landmark, ShoppingCart, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@abms/ui";
import { ROLE_LABELS } from "@abms/shared";
import { useAuth } from "../../providers/auth-provider";

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
  }
`;

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useQuery<{
    deals: Array<{ id: string; stage: string }>;
    lowStockProducts: Array<{ id: string }>;
    salesOrders: Array<{ id: string; status: string }>;
    receivables: Array<{ totalOwed: number }>;
    payables: Array<{ totalOwed: number }>;
  }>(QUERY);

  const openDeals = data?.deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST").length ?? 0;
  const lowStock = data?.lowStockProducts.length ?? 0;
  const openOrders = data?.salesOrders.filter((o) => o.status !== "CANCELLED" && o.status !== "DELIVERED").length ?? 0;
  const receivablesTotal = data?.receivables.reduce((s, r) => s + r.totalOwed, 0) ?? 0;
  const payablesTotal = data?.payables.reduce((s, p) => s + p.totalOwed, 0) ?? 0;

  const WIDGETS = [
    { label: "Open Deals", value: loading ? "—" : String(openDeals), icon: Users },
    { label: "Low Stock Items", value: loading ? "—" : String(lowStock), icon: Boxes },
    { label: "Open Sales Orders", value: loading ? "—" : String(openOrders), icon: ShoppingCart },
    { label: "Receivables Outstanding", value: loading ? "—" : `$${receivablesTotal.toFixed(2)}`, icon: Landmark },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user?.name}</h1>
        <p className="text-sm text-muted-foreground">{user ? ROLE_LABELS[user.role] : ""} dashboard</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WIDGETS.map((w) => (
          <Card key={w.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{w.label}</CardDescription>
              <w.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-2xl">{w.value}</CardTitle>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cross-module summary</CardTitle>
          <CardDescription>
            {loading
              ? "Loading…"
              : `${openDeals} open deal${openDeals === 1 ? "" : "s"}, ${lowStock} product${lowStock === 1 ? "" : "s"} below reorder threshold, ${openOrders} order${openOrders === 1 ? "" : "s"} awaiting fulfillment or invoicing, $${payablesTotal.toFixed(2)} owed to suppliers.`}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
