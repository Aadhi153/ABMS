import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { CheckCircle2, ClipboardCheck, Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeLite, KpiTemplate, PerformanceReview } from "./types";

const REVIEWS_QUERY = gql`
  query ManagerReviewsPanelData {
    performanceReviews {
      id
      employeeId
      employeeName
      period
      selfScore
      rating
      status
    }
    kpiTemplates {
      id
      title
      active
      targets {
        id
        targetName
        weightagePct
      }
    }
  }
`;
const GENERATE_CYCLE = gql`
  mutation GenerateAppraisalCyclePanel($input: GenerateAppraisalCycleInput!) {
    generateAppraisalCycle(input: $input) {
      id
    }
  }
`;
const CREATE_GOAL = gql`
  mutation CreatePerformanceGoalPanel($input: CreatePerformanceGoalInput!) {
    createPerformanceGoal(input: $input) {
      id
    }
  }
`;

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const EMPTY_GOAL_FORM = { employeeId: "", kpiTemplateId: "", targetId: "", period: currentPeriod(), weightagePct: "" };

export default function ManagerReviewsPanel({ employees }: { employees: EmployeeLite[] }) {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ performanceReviews: PerformanceReview[]; kpiTemplates: KpiTemplate[] }>(REVIEWS_QUERY);
  const [generateCycle] = useMutation(GENERATE_CYCLE);
  const [createGoal] = useMutation(CREATE_GOAL);

  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [cyclePeriod, setCyclePeriod] = useState(currentPeriod());
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const reviews = data?.performanceReviews ?? [];
  const kpiTemplates = (data?.kpiTemplates ?? []).filter((t) => t.active);
  const selectedTemplate = kpiTemplates.find((t) => t.id === goalForm.kpiTemplateId);

  async function handleGenerateCycle() {
    if (!cyclePeriod) {
      toast.error("Pick a period");
      return;
    }
    setSubmitting(true);
    try {
      const res = await generateCycle({ variables: { input: { period: cyclePeriod } } });
      const created = res.data?.generateAppraisalCycle?.length ?? 0;
      toast.success(created > 0 ? `Generated ${created} appraisal${created === 1 ? "" : "s"}` : "All employees already have an appraisal for this period");
      setCycleDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate appraisal cycle");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateGoal() {
    if (!goalForm.employeeId || !goalForm.kpiTemplateId || !goalForm.period || !goalForm.weightagePct) {
      toast.error("Employee, KPI template, period, and weightage are required");
      return;
    }
    setSubmitting(true);
    try {
      await createGoal({
        variables: {
          input: {
            employeeId: goalForm.employeeId,
            kpiTemplateId: goalForm.kpiTemplateId,
            targetId: goalForm.targetId || undefined,
            period: goalForm.period,
            weightagePct: Number(goalForm.weightagePct),
          },
        },
      });
      toast.success("Goal assigned");
      setGoalDialogOpen(false);
      setGoalForm(EMPTY_GOAL_FORM);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign goal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Team Performance Appraisals</CardTitle>
            <CardDescription>Conduct appraisals for your team members. Rate goals and submit final score reports.</CardDescription>
          </div>
          <Button onClick={() => setCycleDialogOpen(true)} className={cn("shrink-0 gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" />
            Generate Appraisal Cycle
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Period</th>
                <th className="px-4 py-2.5 font-medium text-right">Self score</th>
                <th className="px-4 py-2.5 font-medium text-right">Final score</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && reviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No appraisals yet. Generate an appraisal cycle to get started.
                  </td>
                </tr>
              )}
              {reviews.map((r, idx) => {
                const completed = r.status === "SUBMITTED" || r.status === "ACKNOWLEDGED" || r.status === "CLOSED";
                return (
                  <tr
                    key={r.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.period}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{r.selfScore != null ? r.selfScore : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{r.rating != null ? r.rating : "—"}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={completed ? "COMPLETED" : r.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      {completed ? (
                        <button
                          onClick={() => navigate(`/hrms/performance/reviews/${r.id}`)}
                          className="flex items-center gap-1 text-xs font-medium text-success hover:underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reviewed
                        </button>
                      ) : (
                        <Button size="xs" variant="outline" onClick={() => navigate(`/hrms/performance/reviews/${r.id}`)} className={BUTTON_PRESS}>
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign Performance Goal</CardTitle>
          <CardDescription>Create individual targets and goals linked to KPI configuration templates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setGoalDialogOpen(true)} className={cn("w-full gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" />
            Assign New Goal
          </Button>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goal assignment guidelines</p>
            <ul className="list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
              <li>Each goal should be mapped to a specific KPI Template.</li>
              <li>Weights must sum up to 100% per employee for a cycle.</li>
              <li>Goals automatically populate the employee's appraisal cycles.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Generate Appraisal Cycle
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Creates a draft appraisal for every active employee who doesn't already have one this period.</p>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Period *</Label>
            <Input type="month" value={cyclePeriod} onChange={(e) => setCyclePeriod(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCycleDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleGenerateCycle} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Performance Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={goalForm.employeeId} onValueChange={(v) => setGoalForm({ ...goalForm, employeeId: v })}>
                <SelectTrigger>
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
              <Label>KPI Template *</Label>
              <Select
                value={goalForm.kpiTemplateId}
                onValueChange={(v) => {
                  const tpl = kpiTemplates.find((t) => t.id === v);
                  setGoalForm({ ...goalForm, kpiTemplateId: v, targetId: "", weightagePct: tpl?.targets[0]?.weightagePct.toString() ?? goalForm.weightagePct });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select KPI template" />
                </SelectTrigger>
                <SelectContent>
                  {kpiTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTemplate && selectedTemplate.targets.length > 0 && (
              <div className="space-y-1.5">
                <Label>Target</Label>
                <Select
                  value={goalForm.targetId}
                  onValueChange={(v) => {
                    const target = selectedTemplate.targets.find((t) => t.id === v);
                    setGoalForm({ ...goalForm, targetId: v, weightagePct: target ? target.weightagePct.toString() : goalForm.weightagePct });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTemplate.targets.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.targetName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Period *</Label>
                <Input type="month" value={goalForm.period} onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Weightage (%) *</Label>
                <Input type="number" min="0" max="100" value={goalForm.weightagePct} onChange={(e) => setGoalForm({ ...goalForm, weightagePct: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreateGoal} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Assigning…" : "Assign Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
