import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, cn, toast } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { IncentiveMatrixRule } from "./types";
import { inr } from "./hrms-helpers";

const RULES_QUERY = gql`
  query IncentiveMatrixRulesPanelData {
    incentiveMatrixRules {
      id
      minScore
      maxScore
      bonusAmount
      incrementPct
      createdAt
    }
  }
`;
const CREATE_RULE = gql`
  mutation CreateIncentiveMatrixRulePanel($input: CreateIncentiveMatrixRuleInput!) {
    createIncentiveMatrixRule(input: $input) {
      id
    }
  }
`;
const DELETE_RULE = gql`
  mutation DeleteIncentiveMatrixRulePanel($id: String!) {
    deleteIncentiveMatrixRule(id: $id)
  }
`;

const EMPTY_FORM = { minScore: "3.0", maxScore: "5.0", bonusAmount: "", incrementPct: "" };

export default function IncentiveMatrixPanel() {
  const { data, loading, refetch } = useQuery<{ incentiveMatrixRules: IncentiveMatrixRule[] }>(RULES_QUERY);
  const [createRule] = useMutation(CREATE_RULE);
  const [deleteRule] = useMutation(DELETE_RULE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const rules = data?.incentiveMatrixRules ?? [];

  async function handleCreate() {
    if (!form.minScore || !form.maxScore || !form.bonusAmount) {
      toast.error("Min score, max score, and payout bonus amount are required");
      return;
    }
    setSubmitting(true);
    try {
      await createRule({
        variables: {
          input: {
            minScore: Number(form.minScore),
            maxScore: Number(form.maxScore),
            bonusAmount: Number(form.bonusAmount),
            incrementPct: form.incrementPct ? Number(form.incrementPct) : undefined,
          },
        },
      });
      toast.success("Incentive rule created");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRule({ variables: { id } });
      toast.success("Incentive rule deleted");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Incentive Calculation Matrix Rules</p>
            <p className="text-xs text-muted-foreground">Setup ranges of appraisal scores that trigger incentive payout calculations.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className={cn("shrink-0 gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" />
            Add Incentive Rule
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Min appraisal score</th>
                <th className="px-4 py-2.5 font-medium">Max appraisal score</th>
                <th className="px-4 py-2.5 font-medium text-right">Incentive bonus (₹)</th>
                <th className="px-4 py-2.5 font-medium text-right">Increment percentage (%)</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {!loading && rules.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No incentive matrix rules configured yet.
                  </td>
                </tr>
              )}
              {rules.map((r, idx) => (
                <tr
                  key={r.id}
                  className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                  style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                >
                  <td className="px-4 py-2.5 text-foreground">{r.minScore.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-foreground">{r.maxScore.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-success">{inr(r.bonusAmount)}</td>
                  <td className="px-4 py-2.5 text-right text-foreground">{r.incrementPct ? `${r.incrementPct}%` : "N/A"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)} className={BUTTON_PRESS}>
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Incentive Rule</DialogTitle>
            <p className="text-sm text-muted-foreground">Define a score range and payout for calculations.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min Score *</Label>
                <Input type="number" step="0.1" min="0" max="5" value={form.minScore} onChange={(e) => setForm({ ...form, minScore: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Score *</Label>
                <Input type="number" step="0.1" min="0" max="5" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payout Bonus Amount (₹) *</Label>
              <Input type="number" min="0" placeholder="5000" value={form.bonusAmount} onChange={(e) => setForm({ ...form, bonusAmount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Salary Increment (%)</Label>
              <Input type="number" min="0" placeholder="0" value={form.incrementPct} onChange={(e) => setForm({ ...form, incrementPct: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
