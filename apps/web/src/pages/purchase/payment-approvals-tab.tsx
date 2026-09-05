import { useMemo, useState } from "react";
import { Check, Clock, RefreshCw, ShieldAlert, Wallet, X } from "lucide-react";
import { Card, CardContent, Button } from "@abms/ui";
import { Role } from "@abms/shared";
import { useAuth } from "../../providers/auth-provider";
import { inr, StatGrid } from "./purchase-helpers";
import type { SupplierPayment } from "./types";

export function PaymentApprovalsTab({
  pendingPayments,
  loading,
  submitting,
  onApprove,
  onReject,
  onRowClick,
  onRefetch,
}: {
  pendingPayments: SupplierPayment[];
  loading: boolean;
  submitting: boolean;
  onApprove: (payment: SupplierPayment) => void;
  onReject: (payment: SupplierPayment) => void;
  onRowClick: (payment: SupplierPayment) => void;
  onRefetch: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const [actingId, setActingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const suppliers = new Set(pendingPayments.map((p) => p.supplierId)).size;
    return { count: pendingPayments.length, total, suppliers };
  }, [pendingPayments]);

  const widgets = [
    { label: "Awaiting Approval", value: loading ? "—" : String(stats.count), icon: Clock, iconClass: "text-warning", footer: "Payment requests" },
    { label: "Total Pending", value: loading ? "—" : inr(stats.total), icon: Wallet, iconClass: "text-primary", footer: "Requested amount" },
    { label: "Suppliers Involved", value: loading ? "—" : String(stats.suppliers), icon: ShieldAlert, iconClass: "text-slate-500", footer: "Unique suppliers" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Payment Approval Queue</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Approve or reject pending supplier payment requests." : "Payment requests awaiting admin approval."}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={onRefetch}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <StatGrid widgets={widgets} />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          ) : pendingPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Check className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nothing pending — the queue is clear.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Bill #</th>
                    <th className="px-4 py-2.5 font-medium">Supplier</th>
                    <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Method</th>
                    <th className="px-4 py-2.5 font-medium">Requested by</th>
                    <th className="px-4 py-2.5 font-medium">Requested on</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="cursor-pointer px-4 py-2.5 font-mono text-xs text-primary" onClick={() => onRowClick(p)}>{p.billNumber}</td>
                      <td className="cursor-pointer px-4 py-2.5" onClick={() => onRowClick(p)}>{p.supplierName}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">{inr(p.amount)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.method.replaceAll("_", " ")}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{p.requestedByName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isAdmin ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 border-danger/30 px-2 text-xs text-danger hover:bg-danger-bg"
                              disabled={submitting}
                              onClick={async () => { setActingId(p.id); await onReject(p); setActingId(null); }}
                            >
                              <X className="h-3.5 w-3.5" />
                              {submitting && actingId === p.id ? "…" : "Reject"}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              disabled={submitting}
                              onClick={async () => { setActingId(p.id); await onApprove(p); setActingId(null); }}
                            >
                              <Check className="h-3.5 w-3.5" />
                              {submitting && actingId === p.id ? "…" : "Approve"}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Awaiting admin</span>
                        )}
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
