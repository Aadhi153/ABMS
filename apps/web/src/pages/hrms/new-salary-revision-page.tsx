import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { TrendingUp } from "lucide-react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@abms/ui";
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
import type { Employee } from "./types";
import { inr } from "./hrms-helpers";

const PROMOTIONS_ROUTE = "/hrms/promotions";

const EMPLOYEES_QUERY = gql`
  query NewSalaryRevisionEmployees {
    employees {
      id
      fullName
      designation
      monthlyGrossSalary
    }
  }
`;
const CREATE_REVISION = gql`
  mutation CreateSalaryRevisionPage($input: CreateSalaryRevisionInput!) {
    createSalaryRevision(input: $input) {
      id
    }
  }
`;

export default function NewSalaryRevisionPage() {
  const { data } = useQuery<{ employees: Employee[] }>(EMPLOYEES_QUERY);
  const [createRevision] = useMutation(CREATE_REVISION);
  const employees = data?.employees ?? [];

  const [employeeId, setEmployeeId] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [newSalary, setNewSalary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = !!employeeId || !!newSalary || !!newDesignation || !!reason;
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(PROMOTIONS_ROUTE, dirty && status === "idle");

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId || !newSalary) {
      setError("Employee and new salary are required");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await createRevision({
        variables: {
          input: {
            employeeId,
            newDesignation: newDesignation || undefined,
            newSalary: Number(newSalary),
            effectiveDate,
            reason: reason || undefined,
          },
        },
      });
      setStatus("success");
      toast.success("Salary revision created");
      holdSuccessThen(() => exitTo(PROMOTIONS_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create salary revision";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "HRMS", to: PROMOTIONS_ROUTE }, { label: "Promotion & Salary Increment", to: PROMOTIONS_ROUTE }, { label: "New" }]}
          title="New Salary Revision"
          subtitle="Record a promotion or salary increment for an employee"
          icon={<TrendingUp className="h-5 w-5" />}
          backLabel="Back to Promotions"
          onBack={goBack}
          onNavigate={requestNavigate}
        />

        <FormErrorBanner message={error} />

        <form id="new-salary-revision-form" onSubmit={handleSubmit} className="space-y-6">
          <FormSection title="Revision details" index={0}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
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
                        {e.fullName} — {e.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>New designation</Label>
                <Input
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder={selectedEmployee?.designation ?? "Unchanged"}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  New monthly salary
                  <RequiredMark />
                </Label>
                <Input type="number" min="0" value={newSalary} onChange={(e) => setNewSalary(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Effective date
                  <RequiredMark />
                </Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={FOCUS_GLOW} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Annual increment, promotion, market adjustment…" className={FOCUS_GLOW} />
            </div>

            {selectedEmployee && newSalary && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="text-xs font-medium uppercase text-muted-foreground">Preview</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-muted-foreground">{inr(selectedEmployee.monthlyGrossSalary)}</span>
                  <span>→</span>
                  <span className="font-semibold text-foreground">{inr(Number(newSalary))}</span>
                  <span className="text-success">
                    (+{(((Number(newSalary) - selectedEmployee.monthlyGrossSalary) / selectedEmployee.monthlyGrossSalary) * 100).toFixed(1)}%)
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
          formId="new-salary-revision-form"
          status={status}
          idleIcon={<TrendingUp className="h-4 w-4" />}
          idleLabel="Create Revision"
          loadingLabel="Creating…"
          successLabel="Created"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
