import { useState } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, Ban, Check, CheckCircle2, HandCoins, X } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { FormBreadcrumb, FormPage } from "../products/form-page";
import { BUTTON_PRESS, usePageTransition } from "../products/form-motion";
import type { EmployeeLoan } from "./types";
import { fmtDate, inr, titleCase } from "./hrms-helpers";

const LOANS_ROUTE = "/hrms/loans";

const LOAN_QUERY = gql`
  query LoanDetailData($id: String!) {
    loan(id: $id) {
      id
      loanNumber
      employeeId
      employeeName
      loanType
      principalAmount
      interestRatePct
      tenureMonths
      emiAmount
      startDate
      status
      reason
      approvedByName
      approvedAt
      outstandingAmount
      repayments {
        id
        installmentNumber
        dueDate
        amount
        status
        paidAt
      }
    }
  }
`;
const APPROVE_LOAN = gql`
  mutation ApproveLoanDetail($id: String!) {
    approveLoan(id: $id) {
      id
    }
  }
`;
const REJECT_LOAN = gql`
  mutation RejectLoanDetail($id: String!) {
    rejectLoan(id: $id) {
      id
    }
  }
`;
const CLOSE_LOAN = gql`
  mutation CloseLoanDetail($id: String!) {
    closeLoan(id: $id) {
      id
    }
  }
`;
const MARK_REPAYMENT_PAID = gql`
  mutation MarkRepaymentPaidDetail($id: String!) {
    markRepaymentPaid(id: $id) {
      id
    }
  }
`;

export default function LoanDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ loan: EmployeeLoan | null }>(LOAN_QUERY, { variables: { id }, skip: !id });
  const [approveLoan] = useMutation(APPROVE_LOAN);
  const [rejectLoan] = useMutation(REJECT_LOAN);
  const [closeLoan] = useMutation(CLOSE_LOAN);
  const [markRepaymentPaid] = useMutation(MARK_REPAYMENT_PAID);
  const [submitting, setSubmitting] = useState(false);

  const loan = data?.loan;

  async function run(action: () => Promise<unknown>, successMsg: string) {
    setSubmitting(true);
    try {
      await action();
      toast.success(successMsg);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </FormPage>
    );
  }
  if (!loading && !loan) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Button variant="ghost" size="sm" onClick={() => goWithExit(LOANS_ROUTE)} className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Loan not found</h1>
        </div>
      </FormPage>
    );
  }

  return (
    <FormPage leaving={leaving}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-3">
          <FormBreadcrumb items={[{ label: "HRMS", to: LOANS_ROUTE }, { label: "Loans", to: LOANS_ROUTE }, { label: loan!.loanNumber }]} onNavigate={goWithExit} />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <HandCoins className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{loan!.loanNumber}</h1>
                  <StatusBadge status={loan!.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{loan!.employeeName}</p>
              </div>
            </div>
            <Button variant="outline" size="xs" onClick={() => goWithExit(LOANS_ROUTE)} className={cn("shrink-0", BUTTON_PRESS)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Loans
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Repayment schedule</CardTitle>
                <CardDescription>{loan!.repayments.length} installments</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">#</th>
                      <th className="px-4 py-2.5 font-medium">Due date</th>
                      <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {loan!.repayments.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                        style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
                      >
                        <td className="px-4 py-2.5">{r.installmentNumber}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.dueDate)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{inr(r.amount)}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          {r.status === "SCHEDULED" && (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={submitting}
                              onClick={() => run(() => markRepaymentPaid({ variables: { id: r.id } }), "Repayment marked paid")}
                              className={BUTTON_PRESS}
                            >
                              Mark paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Loan info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <Row label="Loan type" value={titleCase(loan!.loanType)} />
                <Row label="Principal" value={inr(loan!.principalAmount)} />
                <Row label="Interest rate" value={`${loan!.interestRatePct}%`} />
                <Row label="Tenure" value={`${loan!.tenureMonths} months`} />
                <Row label="EMI" value={inr(loan!.emiAmount)} />
                <Row label="Start date" value={fmtDate(loan!.startDate)} />
                <Row label="Outstanding" value={inr(loan!.outstandingAmount)} />
                {loan!.reason && <Row label="Reason" value={loan!.reason} />}
                {loan!.approvedByName && <Row label="Approved by" value={loan!.approvedByName} />}
              </CardContent>
            </Card>

            {(loan!.status === "PENDING" || loan!.status === "ACTIVE") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {loan!.status === "PENDING" && (
                    <>
                      <Button
                        disabled={submitting}
                        onClick={() => run(() => approveLoan({ variables: { id } }), "Loan approved")}
                        className={cn("gap-1.5", BUTTON_PRESS)}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={submitting}
                        onClick={() => run(() => rejectLoan({ variables: { id } }), "Loan rejected")}
                        className={cn("gap-1.5", BUTTON_PRESS)}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {loan!.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      disabled={submitting}
                      onClick={() => run(() => closeLoan({ variables: { id } }), "Loan closed")}
                      className={cn("gap-1.5", BUTTON_PRESS)}
                    >
                      <Ban className="h-4 w-4" />
                      Close loan
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {loan!.status === "CLOSED" && (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Loan fully closed
              </div>
            )}
          </div>
        </div>
      </div>
    </FormPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
