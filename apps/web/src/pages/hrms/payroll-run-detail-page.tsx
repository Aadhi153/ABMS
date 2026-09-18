import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, Ban, CheckCircle2, PlayCircle, ThumbsUp, Wallet } from "lucide-react";
import {
  Badge,
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
import type { PayrollRun, Payslip } from "./types";
import { inr, monthLabel } from "./hrms-helpers";

const PAYROLL_ROUTE = "/hrms/payroll";

const RUN_QUERY = gql`
  query PayrollRunDetailData($id: String!) {
    payrollRun(id: $id) {
      id
      month
      year
      status
      totalGross
      totalDeductions
      totalNet
      processedByName
      processedAt
      payslipCount
    }
    payslips(payrollRunId: $id) {
      id
      payslipNumber
      employeeName
      employeeCode
      grossEarnings
      totalDeductions
      netPay
      status
    }
  }
`;
const PROCESS_RUN = gql`
  mutation ProcessPayrollRunDetail($id: String!) {
    processPayrollRun(id: $id) {
      id
    }
  }
`;
const APPROVE_RUN = gql`
  mutation ApprovePayrollRunDetail($id: String!) {
    approvePayrollRun(id: $id) {
      id
    }
  }
`;
const MARK_PAID = gql`
  mutation MarkPayrollRunPaidDetail($id: String!) {
    markPayrollRunPaid(id: $id) {
      id
    }
  }
`;
const CANCEL_RUN = gql`
  mutation CancelPayrollRunDetail($id: String!) {
    cancelPayrollRun(id: $id) {
      id
    }
  }
`;

export default function PayrollRunDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ payrollRun: PayrollRun | null; payslips: Payslip[] }>(RUN_QUERY, { variables: { id }, skip: !id });
  const [processRun] = useMutation(PROCESS_RUN);
  const [approveRun] = useMutation(APPROVE_RUN);
  const [markPaid] = useMutation(MARK_PAID);
  const [cancelRun] = useMutation(CANCEL_RUN);
  const [submitting, setSubmitting] = useState(false);

  const run = data?.payrollRun;
  const payslips = data?.payslips ?? [];

  async function act(action: () => Promise<unknown>, successMsg: string) {
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
  if (!loading && !run) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Button variant="ghost" size="sm" onClick={() => goWithExit(PAYROLL_ROUTE)} className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Payroll run not found</h1>
        </div>
      </FormPage>
    );
  }

  return (
    <FormPage leaving={leaving}>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-3">
          <FormBreadcrumb items={[{ label: "HRMS", to: PAYROLL_ROUTE }, { label: "Payroll & Payslips", to: PAYROLL_ROUTE }, { label: monthLabel(run!.month, run!.year) }]} onNavigate={goWithExit} />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{monthLabel(run!.month, run!.year)}</h1>
                  <StatusBadge status={run!.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{run!.payslipCount} payslips</p>
              </div>
            </div>
            <Button variant="outline" size="xs" onClick={() => goWithExit(PAYROLL_ROUTE)} className={cn("shrink-0", BUTTON_PRESS)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Payroll
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Payslips</CardTitle>
                <CardDescription>{payslips.length} employee{payslips.length === 1 ? "" : "s"}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Employee</th>
                      <th className="px-4 py-2.5 font-medium text-right">Gross</th>
                      <th className="px-4 py-2.5 font-medium text-right">Deductions</th>
                      <th className="px-4 py-2.5 font-medium text-right">Net</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslips.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          Not processed yet.
                        </td>
                      </tr>
                    )}
                    {payslips.map((p, idx) => (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/hrms/payroll/payslips/${p.id}`)}
                        className="animate-in fade-in slide-in-from-top-1 cursor-pointer border-b border-border duration-150 ease-out last:border-0 hover:bg-muted/40"
                        style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{p.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{p.payslipNumber}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right">{inr(p.grossEarnings)}</td>
                        <td className="px-4 py-2.5 text-right">{inr(p.totalDeductions)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{inr(p.netPay)}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={p.status} />
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
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross</span>
                  <span>{inr(run!.totalGross)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Deductions</span>
                  <span>-{inr(run!.totalDeductions)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                  <span>Net</span>
                  <span>{inr(run!.totalNet)}</span>
                </div>
                {run!.processedByName && (
                  <Badge tone="info" className="mt-1">
                    Processed by {run!.processedByName}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {run!.status !== "PAID" && run!.status !== "CANCELLED" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {(run!.status === "DRAFT" || run!.status === "PROCESSED") && (
                    <Button disabled={submitting} onClick={() => act(() => processRun({ variables: { id } }), "Payroll processed")} className={cn("gap-1.5", BUTTON_PRESS)}>
                      <PlayCircle className="h-4 w-4" />
                      {run!.status === "PROCESSED" ? "Reprocess" : "Process"}
                    </Button>
                  )}
                  {run!.status === "PROCESSED" && (
                    <Button variant="outline" disabled={submitting} onClick={() => act(() => approveRun({ variables: { id } }), "Payroll approved")} className={cn("gap-1.5", BUTTON_PRESS)}>
                      <ThumbsUp className="h-4 w-4" />
                      Approve
                    </Button>
                  )}
                  {run!.status === "APPROVED" && (
                    <Button disabled={submitting} onClick={() => act(() => markPaid({ variables: { id } }), "Payroll marked paid")} className={cn("gap-1.5", BUTTON_PRESS)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Paid
                    </Button>
                  )}
                  {run!.status !== "APPROVED" && (
                    <Button variant="outline" disabled={submitting} onClick={() => act(() => cancelRun({ variables: { id } }), "Payroll run cancelled")} className={cn("gap-1.5", BUTTON_PRESS)}>
                      <Ban className="h-4 w-4" />
                      Cancel run
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </FormPage>
  );
}
