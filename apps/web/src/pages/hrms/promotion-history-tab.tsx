import { gql, useQuery } from "@apollo/client";
import { RefreshCw } from "lucide-react";
import { Button, Card, CardContent, cn } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { SalaryRevision } from "./types";
import { fmtDate } from "./hrms-helpers";

const HISTORY_QUERY = gql`
  query PromotionHistoryTabData {
    salaryRevisions(revisionType: "PROMOTION") {
      id
      employeeName
      previousDesignation
      newDesignation
      previousGradeName
      newGradeName
      effectiveDate
      status
      approvedByName
      reason
    }
  }
`;

export default function PromotionHistoryTab() {
  const { data, loading, refetch } = useQuery<{ salaryRevisions: SalaryRevision[] }>(HISTORY_QUERY, { fetchPolicy: "network-only" });
  const revisions = data?.salaryRevisions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Promotion History Log</h2>
          <p className="text-sm text-muted-foreground">Auditable record of all completed employee rank/grade promotions.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={loading} className={cn("shrink-0 gap-1.5", BUTTON_PRESS)}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh History
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Promotion Date</th>
                  <th className="px-4 py-2.5 font-medium">Employee</th>
                  <th className="px-4 py-2.5 font-medium">Grade Change</th>
                  <th className="px-4 py-2.5 font-medium">Designation Change</th>
                  <th className="px-4 py-2.5 font-medium">Approved By</th>
                  <th className="px-4 py-2.5 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {!loading && revisions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No promotion history found
                    </td>
                  </tr>
                )}
                {revisions.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(r.effectiveDate)}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.employeeName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.previousGradeName ?? "—"} {r.newGradeName && r.newGradeName !== r.previousGradeName ? `→ ${r.newGradeName}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.previousDesignation ?? "—"} {r.newDesignation && r.newDesignation !== r.previousDesignation ? `→ ${r.newDesignation}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.approvedByName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.reason ?? "—"}</td>
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
