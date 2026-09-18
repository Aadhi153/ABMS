import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeft, Check, Save, Star, ThumbsUp } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton, StatusBadge, Textarea, cn, toast } from "@abms/ui";
import { FormBreadcrumb, FormPage } from "../products/form-page";
import { BUTTON_PRESS, usePageTransition } from "../products/form-motion";
import type { PerformanceReview } from "./types";
import { fmtDate, fmtDateTime } from "./hrms-helpers";

const PERFORMANCE_ROUTE = "/hrms/performance";

const REVIEW_QUERY = gql`
  query ReviewDetailData($id: String!) {
    performanceReview(id: $id) {
      id
      employeeId
      employeeName
      reviewerName
      reviewPeriodStart
      reviewPeriodEnd
      period
      rating
      selfScore
      goals
      achievements
      areasOfImprovement
      managerComments
      employeeComments
      status
      submittedAt
      acknowledgedAt
    }
  }
`;
const UPDATE_REVIEW = gql`
  mutation UpdatePerformanceReviewDetail($id: String!, $input: CreatePerformanceReviewInput!) {
    updatePerformanceReview(id: $id, input: $input) {
      id
    }
  }
`;
const SUBMIT_REVIEW = gql`
  mutation SubmitPerformanceReviewDetail($id: String!) {
    submitPerformanceReview(id: $id) {
      id
    }
  }
`;
const ACKNOWLEDGE_REVIEW = gql`
  mutation AcknowledgePerformanceReviewDetail($id: String!) {
    acknowledgePerformanceReview(id: $id) {
      id
    }
  }
`;
const CLOSE_REVIEW = gql`
  mutation ClosePerformanceReviewDetail($id: String!) {
    closePerformanceReview(id: $id) {
      id
    }
  }
`;

const EMPTY_EDIT = { selfScore: "", rating: "", goals: "", achievements: "", areasOfImprovement: "", managerComments: "" };

export default function ReviewDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ performanceReview: PerformanceReview | null }>(REVIEW_QUERY, { variables: { id }, skip: !id });
  const [updateReview] = useMutation(UPDATE_REVIEW);
  const [submitReview] = useMutation(SUBMIT_REVIEW);
  const [acknowledgeReview] = useMutation(ACKNOWLEDGE_REVIEW);
  const [closeReview] = useMutation(CLOSE_REVIEW);
  const [submitting, setSubmitting] = useState(false);
  const [edit, setEdit] = useState(EMPTY_EDIT);

  const review = data?.performanceReview;

  useEffect(() => {
    if (review && review.status === "DRAFT") {
      setEdit({
        selfScore: review.selfScore != null ? String(review.selfScore) : "",
        rating: review.rating != null ? String(review.rating) : "",
        goals: review.goals ?? "",
        achievements: review.achievements ?? "",
        areasOfImprovement: review.areasOfImprovement ?? "",
        managerComments: review.managerComments ?? "",
      });
    }
  }, [review?.id, review?.status]);

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

  function buildInput() {
    return {
      employeeId: review!.employeeId,
      reviewPeriodStart: review!.reviewPeriodStart,
      reviewPeriodEnd: review!.reviewPeriodEnd,
      rating: edit.rating ? Number(edit.rating) : undefined,
      selfScore: edit.selfScore ? Number(edit.selfScore) : undefined,
      goals: edit.goals || undefined,
      achievements: edit.achievements || undefined,
      areasOfImprovement: edit.areasOfImprovement || undefined,
      managerComments: edit.managerComments || undefined,
    };
  }

  async function handleSaveDraft() {
    await run(() => updateReview({ variables: { id, input: buildInput() } }), "Draft saved");
  }

  async function handleSubmit() {
    await run(async () => {
      await updateReview({ variables: { id, input: buildInput() } });
      await submitReview({ variables: { id } });
    }, "Review submitted");
  }

  if (loading && !data) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </FormPage>
    );
  }
  if (!loading && !review) {
    return (
      <FormPage>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Button variant="ghost" size="sm" onClick={() => goWithExit(PERFORMANCE_ROUTE)} className={cn("-ml-2 mb-1 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Review not found</h1>
        </div>
      </FormPage>
    );
  }

  const isDraft = review!.status === "DRAFT";

  return (
    <FormPage leaving={leaving}>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-3">
          <FormBreadcrumb
            items={[{ label: "HRMS", to: PERFORMANCE_ROUTE }, { label: "Performance & Incentives", to: PERFORMANCE_ROUTE }, { label: review!.employeeName }]}
            onNavigate={goWithExit}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{review!.employeeName}</h1>
                  <StatusBadge status={review!.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {fmtDate(review!.reviewPeriodStart)} – {fmtDate(review!.reviewPeriodEnd)} · Reviewed by {review!.reviewerName}
                </p>
              </div>
            </div>
            <Button variant="outline" size="xs" onClick={() => goWithExit(PERFORMANCE_ROUTE)} className={cn("shrink-0", BUTTON_PRESS)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Final score: {review!.rating != null ? `${review!.rating} / 5` : "Not yet scored"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {isDraft ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Self score (out of 5)</Label>
                  <Input type="number" min="0" max="5" step="0.1" value={edit.selfScore} onChange={(e) => setEdit({ ...edit, selfScore: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Final score (out of 5)</Label>
                  <Input type="number" min="1" max="5" step="1" value={edit.rating} onChange={(e) => setEdit({ ...edit, rating: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Goals</Label>
                  <Textarea value={edit.goals} onChange={(e) => setEdit({ ...edit, goals: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Achievements</Label>
                  <Textarea value={edit.achievements} onChange={(e) => setEdit({ ...edit, achievements: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Areas of improvement</Label>
                  <Textarea value={edit.areasOfImprovement} onChange={(e) => setEdit({ ...edit, areasOfImprovement: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Manager comments</Label>
                  <Textarea value={edit.managerComments} onChange={(e) => setEdit({ ...edit, managerComments: e.target.value })} />
                </div>
              </div>
            ) : (
              <>
                {review!.selfScore != null && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Self score</p>
                    <p className="mt-0.5">{review!.selfScore} / 5</p>
                  </div>
                )}
                {review!.goals && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Goals</p>
                    <p className="mt-0.5">{review!.goals}</p>
                  </div>
                )}
                {review!.achievements && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Achievements</p>
                    <p className="mt-0.5">{review!.achievements}</p>
                  </div>
                )}
                {review!.areasOfImprovement && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Areas of improvement</p>
                    <p className="mt-0.5">{review!.areasOfImprovement}</p>
                  </div>
                )}
                {review!.managerComments && (
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Manager comments</p>
                    <p className="mt-0.5">{review!.managerComments}</p>
                  </div>
                )}
              </>
            )}
            {review!.submittedAt && <p className="text-xs text-muted-foreground">Submitted {fmtDateTime(review!.submittedAt)}</p>}
            {review!.acknowledgedAt && <p className="text-xs text-muted-foreground">Acknowledged {fmtDateTime(review!.acknowledgedAt)}</p>}
          </CardContent>
        </Card>

        {(review!.status === "DRAFT" || review!.status === "SUBMITTED") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              {isDraft && (
                <>
                  <Button variant="outline" disabled={submitting} onClick={handleSaveDraft} className={cn("gap-1.5", BUTTON_PRESS)}>
                    <Save className="h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button disabled={submitting || !edit.rating} onClick={handleSubmit} className={cn("gap-1.5", BUTTON_PRESS)}>
                    <Check className="h-4 w-4" />
                    Submit
                  </Button>
                </>
              )}
              {review!.status === "SUBMITTED" && (
                <Button disabled={submitting} onClick={() => run(() => acknowledgeReview({ variables: { id } }), "Review acknowledged")} className={cn("gap-1.5", BUTTON_PRESS)}>
                  <ThumbsUp className="h-4 w-4" />
                  Acknowledge
                </Button>
              )}
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => run(() => closeReview({ variables: { id } }), "Review closed")}
                className={BUTTON_PRESS}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </FormPage>
  );
}
