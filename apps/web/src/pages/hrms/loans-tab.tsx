import { useNavigate } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import { AlertCircle, CheckCircle2, HandCoins, Plus, Wallet } from "lucide-react";
import { Button, Card, CardContent, StatusBadge, cn } from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLoan, EmployeeLite } from "./types";
import { inr, titleCase } from "./hrms-helpers";

const LOANS_QUERY = gql`
  query LoansTabData {
    loans {
      id
      loanNumber
      employeeId
      employeeName
      loanType
      principalAmount
      emiAmount
      tenureMonths
      status
      outstandingAmount
    }
  }
`;

export default function LoansTab({ loading: _shellLoading }: { employees: EmployeeLite[]; loading: boolean }) {
  const navigate = useNavigate();
  const { data, loading } = useQuery<{ loans: EmployeeLoan[] }>(LOANS_QUERY);
  const loans = data?.loans ?? [];

  const active = loans.filter((l) => l.status === "ACTIVE");
  const pending = loans.filter((l) => l.status === "PENDING");
  const closedThisYear = loans.filter((l) => l.status === "CLOSED");
  const totalOutstanding = active.reduce((s, l) => s + l.outstandingAmount, 0);

  const stats = [
    { label: "Active Loans", value: active.length, icon: HandCoins, borderClass: "border-l-primary", iconBg: "bg-primary/10 text-primary" },
    { label: "Total Outstanding", value: inr(totalOutstanding), icon: Wallet, borderClass: "border-l-warning", iconBg: "bg-warning-bg text-warning" },
    { label: "Pending Approvals", value: pending.length, icon: AlertCircle, borderClass: "border-l-danger", iconBg: "bg-danger-bg text-danger" },
    { label: "Closed", value: closedThisYear.length, icon: CheckCircle2, borderClass: "border-l-success", iconBg: "bg-success-bg text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((w) => (
          <Card key={w.label} className={cn(CARD_HOVER, "border-l-4", w.borderClass)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{w.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{w.value}</p>
                </div>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", w.iconBg)}>
                  <w.icon className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{loans.length} loan{loans.length === 1 ? "" : "s"}</p>
            <Button onClick={() => navigate("/hrms/loans/new")} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Plus className="h-4 w-4" />
              New Loan
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Loan #</th>
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium text-right">Principal</th>
                  <th className="px-4 py-2.5 font-medium text-right">EMI</th>
                  <th className="px-4 py-2.5 font-medium text-right">Tenure</th>
                  <th className="px-4 py-2.5 font-medium text-right">Outstanding</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && loans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No loans recorded yet.
                    </td>
                  </tr>
                )}
                {loans.map((l, idx) => (
                  <tr
                    key={l.id}
                    onClick={() => navigate(`/hrms/loans/${l.id}`)}
                    className="animate-in fade-in slide-in-from-top-1 cursor-pointer border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{l.loanNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{l.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{titleCase(l.loanType)}</td>
                    <td className="px-4 py-2.5 text-right">{inr(l.principalAmount)}</td>
                    <td className="px-4 py-2.5 text-right">{inr(l.emiAmount)}</td>
                    <td className="px-4 py-2.5 text-right">{l.tenureMonths} mo</td>
                    <td className="px-4 py-2.5 text-right font-medium">{inr(l.outstandingAmount)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
