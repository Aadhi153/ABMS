import { useParams } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, StatusBadge, cn } from "@abms/ui";
import { FormBreadcrumb, FormPage } from "../products/form-page";
import { BUTTON_PRESS, usePageTransition } from "../products/form-motion";
import type { Payslip } from "./types";
import { inr, monthLabel } from "./hrms-helpers";

const PAYROLL_ROUTE = "/hrms/payroll";

const PAYSLIP_QUERY = gql`
  query PayslipDetailData($id: String!) {
    payslip(id: $id) {
      id
      payslipNumber
      payrollRunId
      month
      year
      employeeName
      employeeCode
      grossEarnings
      totalDeductions
      netPay
      daysPresent
      daysOnLeave
      status
      generatedAt
      paidAt
      components {
        id
        name
        type
        amount
      }
    }
  }
`;

export default function PayslipDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading } = useQuery<{ payslip: Payslip | null }>(PAYSLIP_QUERY, { variables: { id }, skip: !id });
  const payslip = data?.payslip;

  function handlePrint() {
    window.print();
  }

  if (loading && !data) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </FormPage>
    );
  }
  if (!loading && !payslip) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <Button variant="ghost" size="sm" onClick={() => goWithExit(PAYROLL_ROUTE)} className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Payslip not found</h1>
        </div>
      </FormPage>
    );
  }

  const earnings = payslip!.components.filter((c) => c.type === "EARNING");
  const deductions = payslip!.components.filter((c) => c.type === "DEDUCTION");

  return (
    <FormPage leaving={leaving}>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-3">
          <FormBreadcrumb
            items={[
              { label: "HRMS", to: PAYROLL_ROUTE },
              { label: "Payroll & Payslips", to: PAYROLL_ROUTE },
              { label: `${monthLabel(payslip!.month, payslip!.year)}`, to: `/hrms/payroll/${payslip!.payrollRunId}` },
              { label: payslip!.payslipNumber },
            ]}
            onNavigate={goWithExit}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{payslip!.payslipNumber}</h1>
                  <StatusBadge status={payslip!.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {payslip!.employeeName} ({payslip!.employeeCode}) · {monthLabel(payslip!.month, payslip!.year)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="xs" onClick={() => goWithExit(PAYROLL_ROUTE)} className={cn("shrink-0", BUTTON_PRESS)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {earnings.map((c) => (
              <div key={c.id} className="flex justify-between">
                <span className="text-muted-foreground">{c.name}</span>
                <span>{inr(c.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <span>Gross earnings</span>
              <span>{inr(payslip!.grossEarnings)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {deductions.length === 0 ? (
              <p className="text-muted-foreground">No deductions.</p>
            ) : (
              deductions.map((c) => (
                <div key={c.id} className="flex justify-between">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span>-{inr(c.amount)}</span>
                </div>
              ))
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <span>Total deductions</span>
              <span>-{inr(payslip!.totalDeductions)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {payslip!.daysPresent} days present · {payslip!.daysOnLeave} days on leave
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">Net pay: {inr(payslip!.netPay)}</p>
            </div>
            <Button variant="outline" onClick={handlePrint} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </CardContent>
        </Card>
      </div>
    </FormPage>
  );
}
