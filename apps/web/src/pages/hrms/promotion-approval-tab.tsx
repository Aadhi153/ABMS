import { gql, useMutation, useQuery } from "@apollo/client";
import { Award, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge, Button, Card, CardContent, cn, toast } from "@abms/ui";
import { CARD_HOVER, BUTTON_PRESS } from "../products/form-motion";
import type { PromotionRecommendation } from "./types";
import { inr } from "./hrms-helpers";

const RECOMMENDATIONS_QUERY = gql`
  query PromotionRecommendationsTabData {
    promotionRecommendations {
      employeeId
      employeeCode
      employeeName
      currentDesignation
      nextDesignation
      tenureMonths
      tenureRequiredMonths
      currentPay
      proposedMinBasic
      eligible
      reason
    }
  }
`;
const PROMOTE_EMPLOYEE = gql`
  mutation PromoteEmployeeTab($employeeId: String!) {
    promoteEmployee(employeeId: $employeeId) {
      id
    }
  }
`;

export default function PromotionApprovalTab() {
  const { data, loading, refetch } = useQuery<{ promotionRecommendations: PromotionRecommendation[] }>(RECOMMENDATIONS_QUERY, {
    fetchPolicy: "network-only",
  });
  const [promote, { loading: promoting }] = useMutation(PROMOTE_EMPLOYEE);

  const recommendations = data?.promotionRecommendations ?? [];

  async function handlePromote(employeeId: string, name: string) {
    try {
      await promote({ variables: { employeeId } });
      toast.success(`${name} promoted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote employee");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Promotion Eligibility recommendations</h2>
          <p className="text-sm text-muted-foreground">Automated grade progression candidates based on configured experience tenure and orders.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={loading} className={cn("shrink-0 gap-1.5", BUTTON_PRESS)}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh recommendations
        </Button>
      </div>

      {!loading && recommendations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <ShieldAlert className="h-6 w-6 opacity-50" />
            No active employees to evaluate for promotion.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((r, idx) => (
          <Card
            key={r.employeeId}
            className={cn(CARD_HOVER, "animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out")}
            style={{ animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }}
          >
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="font-semibold text-foreground">{r.employeeName}</p>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{r.employeeCode}</span>
                  <Badge tone="muted">{r.currentDesignation}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-y border-border py-2.5 text-xs">
                <div>
                  <p className="uppercase text-muted-foreground">Current Role</p>
                  <p className="font-medium text-foreground">{r.currentDesignation}</p>
                </div>
                <div>
                  <p className="uppercase text-muted-foreground">Next Promotion</p>
                  <p className="font-medium text-primary">{r.nextDesignation}</p>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tenure:</span>
                  <span className={r.tenureMonths >= r.tenureRequiredMonths ? "text-success" : "text-foreground"}>
                    {r.tenureMonths} / {r.tenureRequiredMonths} months
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Pay:</span>
                  <span className="text-foreground">{inr(r.currentPay)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Proposed Min Basic:</span>
                  <span className="text-success">{inr(r.proposedMinBasic)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge tone={r.eligible ? "success" : "warning"}>{r.eligible ? "Eligible" : "Ineligible"}</Badge>
                </div>
              </div>

              {r.reason && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <span className="font-semibold">{r.eligible ? "" : "Ineligible: "}</span>
                    {r.reason}
                  </span>
                </div>
              )}

              {r.eligible && (
                <Button
                  onClick={() => handlePromote(r.employeeId, r.employeeName)}
                  disabled={promoting}
                  className={cn("w-full gap-1.5", BUTTON_PRESS)}
                >
                  <Award className="h-4 w-4" />
                  Promote to {r.nextDesignation}
                </Button>
              )}
              {!r.reason && !r.eligible && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  No action needed yet
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
