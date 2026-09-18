import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { HandCoins } from "lucide-react";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, toast } from "@abms/ui";
import {
  FormCancelButton,
  FormErrorBanner,
  FormFooter,
  FormPage,
  FormPageHeader,
  FormScrollArea,
  FormSection,
  FormSubmitButton,
  RequiredMark,
  useDiscardGuard,
} from "../products/form-page";
import { FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";
import { LOAN_TYPE_OPTIONS, type EmployeeLite } from "./types";
import { inr, titleCase } from "./hrms-helpers";

const LOANS_ROUTE = "/hrms/loans";

const EMPLOYEES_QUERY = gql`
  query NewLoanEmployees {
    employees {
      id
      fullName
    }
  }
`;
const CREATE_LOAN = gql`
  mutation CreateLoanPage($input: CreateLoanInput!) {
    createLoan(input: $input) {
      id
    }
  }
`;

export default function NewLoanPage() {
  const { data } = useQuery<{ employees: EmployeeLite[] }>(EMPLOYEES_QUERY);
  const [createLoan] = useMutation(CREATE_LOAN);
  const employees = data?.employees ?? [];

  const [employeeId, setEmployeeId] = useState("");
  const [loanType, setLoanType] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRatePct, setInterestRatePct] = useState("0");
  const [tenureMonths, setTenureMonths] = useState("12");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = !!employeeId || !!loanType || !!principalAmount || !!reason;
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(LOANS_ROUTE, dirty && status === "idle");

  const principal = Number(principalAmount) || 0;
  const rate = Number(interestRatePct) || 0;
  const months = Number(tenureMonths) || 1;
  const totalPayable = Math.round(principal * (1 + rate / 100) * 100) / 100;
  const emi = months > 0 ? Math.round((totalPayable / months) * 100) / 100 : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId || !loanType || !principalAmount || !tenureMonths) {
      setError("Employee, loan type, principal amount, and tenure are required");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await createLoan({
        variables: {
          input: {
            employeeId,
            loanType,
            principalAmount: principal,
            interestRatePct: rate,
            tenureMonths: months,
            startDate,
            reason: reason || undefined,
          },
        },
      });
      setStatus("success");
      toast.success("Loan request created");
      holdSuccessThen(() => exitTo(LOANS_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create loan";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "HRMS", to: LOANS_ROUTE }, { label: "Loans", to: LOANS_ROUTE }, { label: "New" }]}
          title="New Loan"
          subtitle="Request a salary advance or personal loan for an employee"
          icon={<HandCoins className="h-5 w-5" />}
          backLabel="Back to Loans"
          onBack={goBack}
          onNavigate={requestNavigate}
        />

        <FormErrorBanner message={error} />

        <form id="new-loan-form" onSubmit={handleSubmit} className="space-y-6">
          <FormSection title="Loan details" index={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="col-span-2 space-y-1.5">
                <Label>
                  Employee
                  <RequiredMark />
                </Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Loan type
                  <RequiredMark />
                </Label>
                <Select value={loanType} onValueChange={setLoanType}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {titleCase(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Principal amount
                  <RequiredMark />
                </Label>
                <Input type="number" min="1" value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Interest rate (%)</Label>
                <Input type="number" min="0" value={interestRatePct} onChange={(e) => setInterestRatePct(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Tenure (months)
                  <RequiredMark />
                </Label>
                <Input type="number" min="1" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={FOCUS_GLOW} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className={FOCUS_GLOW} />
            </div>

            {principal > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="text-xs font-medium uppercase text-muted-foreground">EMI preview</p>
                <div className="mt-1 flex items-center gap-4">
                  <span>
                    Total payable: <span className="font-semibold text-foreground">{inr(totalPayable)}</span>
                  </span>
                  <span>
                    Monthly EMI: <span className="font-semibold text-foreground">{inr(emi)}</span> × {months}
                  </span>
                </div>
              </div>
            )}
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle"} />
        <FormSubmitButton
          formId="new-loan-form"
          status={status}
          idleIcon={<HandCoins className="h-4 w-4" />}
          idleLabel="Create Loan"
          loadingLabel="Creating…"
          successLabel="Created"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
