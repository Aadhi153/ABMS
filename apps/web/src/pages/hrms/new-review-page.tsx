import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Star } from "lucide-react";
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
import type { EmployeeLite } from "./types";

const PERFORMANCE_ROUTE = "/hrms/performance";

const EMPLOYEES_QUERY = gql`
  query NewReviewEmployees {
    employees {
      id
      fullName
    }
  }
`;
const CREATE_REVIEW = gql`
  mutation CreatePerformanceReviewPage($input: CreatePerformanceReviewInput!) {
    createPerformanceReview(input: $input) {
      id
    }
  }
`;

const RATINGS = [1, 2, 3, 4, 5];

export default function NewReviewPage() {
  const { data } = useQuery<{ employees: EmployeeLite[] }>(EMPLOYEES_QUERY);
  const [createReview] = useMutation(CREATE_REVIEW);
  const employees = data?.employees ?? [];

  const [employeeId, setEmployeeId] = useState("");
  const [reviewPeriodStart, setReviewPeriodStart] = useState("");
  const [reviewPeriodEnd, setReviewPeriodEnd] = useState("");
  const [rating, setRating] = useState("3");
  const [goals, setGoals] = useState("");
  const [achievements, setAchievements] = useState("");
  const [areasOfImprovement, setAreasOfImprovement] = useState("");
  const [managerComments, setManagerComments] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = !!employeeId || !!goals || !!achievements;
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(PERFORMANCE_ROUTE, dirty && status === "idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!employeeId || !reviewPeriodStart || !reviewPeriodEnd) {
      setError("Employee and review period are required");
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      await createReview({
        variables: {
          input: {
            employeeId,
            reviewPeriodStart,
            reviewPeriodEnd,
            rating: Number(rating),
            goals: goals || undefined,
            achievements: achievements || undefined,
            areasOfImprovement: areasOfImprovement || undefined,
            managerComments: managerComments || undefined,
          },
        },
      });
      setStatus("success");
      toast.success("Performance review created");
      holdSuccessThen(() => exitTo(PERFORMANCE_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create review";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "HRMS", to: PERFORMANCE_ROUTE }, { label: "Performance & Incentives", to: PERFORMANCE_ROUTE }, { label: "New Review" }]}
          title="New Performance Review"
          icon={<Star className="h-5 w-5" />}
          backLabel="Back to Performance"
          onBack={goBack}
          onNavigate={requestNavigate}
        />

        <FormErrorBanner message={error} />

        <form id="new-review-form" onSubmit={handleSubmit} className="space-y-6">
          <FormSection title="Review details" index={0}>
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
                  Period start
                  <RequiredMark />
                </Label>
                <Input type="date" value={reviewPeriodStart} onChange={(e) => setReviewPeriodStart(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Period end
                  <RequiredMark />
                </Label>
                <Input type="date" value={reviewPeriodEnd} onChange={(e) => setReviewPeriodEnd(e.target.value)} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATINGS.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} / 5
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Goals</Label>
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} className={FOCUS_GLOW} />
            </div>
            <div className="space-y-1.5">
              <Label>Achievements</Label>
              <Textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} className={FOCUS_GLOW} />
            </div>
            <div className="space-y-1.5">
              <Label>Areas of improvement</Label>
              <Textarea value={areasOfImprovement} onChange={(e) => setAreasOfImprovement(e.target.value)} className={FOCUS_GLOW} />
            </div>
            <div className="space-y-1.5">
              <Label>Manager comments</Label>
              <Textarea value={managerComments} onChange={(e) => setManagerComments(e.target.value)} className={FOCUS_GLOW} />
            </div>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle"} />
        <FormSubmitButton
          formId="new-review-form"
          status={status}
          idleIcon={<Star className="h-4 w-4" />}
          idleLabel="Create Review"
          loadingLabel="Creating…"
          successLabel="Created"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
