import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Plus, Target, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
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
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { KpiTemplate } from "./types";

const ALL_VALUE = "__all__";

const KPI_TEMPLATES_QUERY = gql`
  query KpiTemplatesPanelData {
    kpiTemplates {
      id
      title
      description
      department
      designation
      active
      targets {
        id
        weightagePct
        targetName
        targetValueDefinition
        incentiveName
      }
      createdAt
    }
    departments {
      id
      name
    }
    designations {
      id
      name
    }
  }
`;
const CREATE_KPI_TEMPLATE = gql`
  mutation CreateKpiTemplatePanel($input: CreateKpiTemplateInput!) {
    createKpiTemplate(input: $input) {
      id
    }
  }
`;

type TargetDraft = { weightagePct: string; targetName: string; targetValueDefinition: string; incentiveName: string };

const EMPTY_TARGET: TargetDraft = { weightagePct: "", targetName: "", targetValueDefinition: "", incentiveName: "" };
const EMPTY_FORM = { title: "", description: "", department: ALL_VALUE, designation: ALL_VALUE, targets: [{ ...EMPTY_TARGET }] };

export default function KpiTemplatesPanel() {
  const { data, loading, refetch } = useQuery<{
    kpiTemplates: KpiTemplate[];
    departments: { id: string; name: string }[];
    designations: { id: string; name: string }[];
  }>(KPI_TEMPLATES_QUERY);
  const [createKpiTemplate] = useMutation(CREATE_KPI_TEMPLATE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const templates = data?.kpiTemplates ?? [];
  const departments = data?.departments ?? [];
  const designations = data?.designations ?? [];

  function updateTarget(index: number, patch: Partial<TargetDraft>) {
    setForm((f) => ({ ...f, targets: f.targets.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }
  function addTarget() {
    setForm((f) => ({ ...f, targets: [...f.targets, { ...EMPTY_TARGET }] }));
  }
  function removeTarget(index: number) {
    setForm((f) => ({ ...f, targets: f.targets.filter((_, i) => i !== index) }));
  }

  async function handleCreate() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    for (const t of form.targets) {
      if (!t.weightagePct || !t.targetName.trim() || !t.targetValueDefinition.trim() || !t.incentiveName.trim()) {
        toast.error("Every target needs weightage, name, value definition, and incentive name");
        return;
      }
    }
    setSubmitting(true);
    try {
      await createKpiTemplate({
        variables: {
          input: {
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            department: form.department === ALL_VALUE ? undefined : form.department,
            designation: form.designation === ALL_VALUE ? undefined : form.designation,
            targets: form.targets.map((t) => ({
              weightagePct: Number(t.weightagePct),
              targetName: t.targetName.trim(),
              targetValueDefinition: t.targetValueDefinition.trim(),
              incentiveName: t.incentiveName.trim(),
            })),
          },
        },
      });
      toast.success("KPI template created");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create KPI template");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">KPI Templates Configurations</p>
            <p className="text-xs text-muted-foreground">Setup standard performance indicators template based on departments and designations.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className={cn("shrink-0 gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-4 w-4" />
            Create KPI Template
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Dept / Desig</th>
                <th className="px-4 py-2.5 font-medium text-right">Weightage</th>
                <th className="px-4 py-2.5 font-medium">Target value definition</th>
              </tr>
            </thead>
            <tbody>
              {!loading && templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No KPI templates configured yet.
                  </td>
                </tr>
              )}
              {templates.map((t, idx) => {
                const totalWeightage = t.targets.reduce((s, x) => s + x.weightagePct, 0);
                const valueDefinition = t.targets.map((x) => (t.targets.length > 1 ? `${x.targetName}: ${x.targetValueDefinition}` : x.targetValueDefinition)).join(" • ");
                return (
                  <tr
                    key={t.id}
                    className="animate-in fade-in slide-in-from-top-1 border-b border-border duration-150 ease-out last:border-0"
                    style={{ animationDelay: `${idx * 25}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-foreground">{t.department ?? "Global / Generic"}</p>
                      {t.designation && <p className="text-xs text-muted-foreground">{t.designation}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-primary">{totalWeightage}%</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{valueDefinition}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New KPI Template</DialogTitle>
            <p className="text-sm text-muted-foreground">Define a standard KPI template mapped to departments/designations.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Sales Conversion Target" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="e.g. Convert active leads to deals" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Select value={form.designation} onValueChange={(v) => setForm({ ...form, designation: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Designations</SelectItem>
                    {designations.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {form.targets.map((t, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Target className="h-3.5 w-3.5" />
                      Target {i + 1}
                    </p>
                    {form.targets.length > 1 && (
                      <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => removeTarget(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Weightage (%) *</Label>
                      <Input type="number" min="0" max="100" placeholder="20" value={t.weightagePct} onChange={(e) => updateTarget(i, { weightagePct: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Target Name *</Label>
                      <Input placeholder="e.g. Conversions" value={t.targetName} onChange={(e) => updateTarget(i, { targetName: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Target Value Definition *</Label>
                      <Input placeholder="e.g. 50" value={t.targetValueDefinition} onChange={(e) => updateTarget(i, { targetValueDefinition: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Incentive Name / Type *</Label>
                      <Input placeholder="e.g. Sales Incentive" value={t.incentiveName} onChange={(e) => updateTarget(i, { incentiveName: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className={cn("w-full gap-1.5", BUTTON_PRESS)} onClick={addTarget}>
                <Plus className="h-4 w-4" />
                Add Another Target
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
