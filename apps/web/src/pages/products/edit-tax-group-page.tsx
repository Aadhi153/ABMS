import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Input, Label, Switch, toast } from "@abms/ui";
import {
  FormPage,
  FormScrollArea,
  FormPageHeader,
  FormSection,
  FormSubsection,
  FormFooter,
  FormErrorBanner,
  FormCancelButton,
  FormSubmitButton,
  FieldError,
  FormStat,
  RequiredMark,
  useDiscardGuard,
  type SubmitStatus,
} from "./form-page";
import { FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const TAX_GROUPS_LIST_ROUTE = "/products/taxgroups";

interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

const EDIT_TAX_GROUP_QUERY = gql`
  query EditTaxGroupData($id: String!) {
    taxGroup(id: $id) {
      id
      name
      code
      active
      totalRate
      createdAt
      updatedAt
      taxRates {
        id
      }
    }
    taxRates {
      id
      name
      rate
    }
  }
`;

const UPDATE_TAX_GROUP_MUTATION = gql`
  mutation UpdateTaxGroupFull($id: String!, $input: UpdateTaxGroupInput!) {
    updateTaxGroup(id: $id, input: $input) {
      id
    }
  }
`;

interface FormState {
  name: string;
  code: string;
  active: boolean;
  taxRateIds: string[];
}

interface TaxGroupRecord {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  totalRate: number;
  createdAt: string;
  updatedAt: string;
  taxRates: Array<{ id: string }>;
}

function taxGroupToFormState(g: TaxGroupRecord): FormState {
  return {
    name: g.name,
    code: g.code ?? "",
    active: g.active,
    taxRateIds: g.taxRates.map((r) => r.id),
  };
}

export default function EditTaxGroupPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{ taxGroup: TaxGroupRecord | null; taxRates: TaxRateOption[] }>(
    EDIT_TAX_GROUP_QUERY,
    { variables: { id }, skip: !id },
  );
  const [updateTaxGroup] = useMutation(UPDATE_TAX_GROUP_MUTATION, { refetchQueries: ["TaxGroups"] });

  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.taxGroup && !form) {
      const hydrated = taxGroupToFormState(data.taxGroup);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(TAX_GROUPS_LIST_ROUTE, dirty);

  const taxRates = data?.taxRates ?? [];

  function toggleRate(rateId: string) {
    setForm((f) =>
      f
        ? {
            ...f,
            taxRateIds: f.taxRateIds.includes(rateId)
              ? f.taxRateIds.filter((r) => r !== rateId)
              : [...f.taxRateIds, rateId],
          }
        : f,
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSubmitError(null);
    setStatus("submitting");
    try {
      await updateTaxGroup({
        variables: {
          id,
          input: {
            name: form.name,
            code: form.code || undefined,
            active: form.active,
            taxRateIds: form.taxRateIds,
          },
        },
      });
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(TAX_GROUPS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update tax group";
      setSubmitError(message);
      toast.error(message);
    }
  }

  if (loading && !form) {
    return (
      <FormPage>
        <FormScrollArea>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!loading && !data?.taxGroup) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Tax Groups", to: TAX_GROUPS_LIST_ROUTE }, { label: "Not found" }]}
            title="Tax group not found"
            backLabel="Back to Tax Groups"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form || !data?.taxGroup) return null;

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[
            { label: "Products", to: "/products/all" },
            { label: "Tax Groups", to: TAX_GROUPS_LIST_ROUTE },
            { label: `Edit ${form.name}` },
          ]}
          title="Edit Tax Group"
          subtitle="Update the tax rates bundled into this group"
          backLabel="Back to Tax Groups"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <FormSection title="Overview" description="Read-only summary for this tax group" index={0}>
          <FormSubsection title="Stats" className="sm:grid-cols-3">
            <FormStat label="Total Rate" value={`${data.taxGroup.totalRate.toFixed(2)}%`} />
            <FormStat label="Created" value={new Date(data.taxGroup.createdAt).toLocaleString()} />
            <FormStat label="Updated" value={new Date(data.taxGroup.updatedAt).toLocaleString()} />
          </FormSubsection>
        </FormSection>
        <form id="tax-group-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Tax Group Information"
            description="Update the core details for this tax group"
            index={1}
          >
            <FormSubsection
              title="Basic Information"
              description="Enter the basic details and required information"
            >
              <div className="space-y-1.5">
                <Label htmlFor="group-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="group-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-code">Code</Label>
                <Input
                  id="group-code"
                  placeholder="e.g. GST-COMBO"
                  value={form.code}
                  onChange={(e) => setForm((f) => (f ? { ...f, code: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>

            <FormSubsection
              title="Tax Rates"
              description="Select the tax rates bundled into this group"
              className="sm:grid-cols-1"
            >
              {taxRates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tax rates available — create one first.</p>
              ) : (
                <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-md border border-border p-3">
                  {taxRates.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={form.taxRateIds.includes(r.id)}
                        onChange={() => toggleRate(r.id)}
                      />
                      {r.name} ({r.rate}%)
                    </label>
                  ))}
                </div>
              )}
            </FormSubsection>

            <div className="flex items-center gap-3">
              <Switch
                id="group-active"
                checked={form.active}
                onCheckedChange={(active) => setForm((f) => (f ? { ...f, active } : f))}
              />
              <div className="space-y-0.5">
                <Label htmlFor="group-active" className="text-sm font-medium">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">Inactive tax groups won't be selectable on products</p>
              </div>
            </div>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="tax-group-form"
          status={status}
          idleLabel="Save changes"
          loadingLabel="Saving…"
          successLabel="Tax group updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
