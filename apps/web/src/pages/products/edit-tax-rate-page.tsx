import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from "@abms/ui";
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

const TAX_RATES_LIST_ROUTE = "/products/taxrates";

const TAX_TYPES = [
  { value: "GST", label: "GST" },
  { value: "VAT", label: "VAT" },
  { value: "SALES_TAX", label: "Sales tax" },
  { value: "OTHER", label: "Other" },
] as const;
type TaxType = (typeof TAX_TYPES)[number]["value"];

const EDIT_TAX_RATE_QUERY = gql`
  query EditTaxRateData($id: String!) {
    taxRate(id: $id) {
      id
      name
      code
      rate
      taxType
      country
      state
      isDefault
      active
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_TAX_RATE_MUTATION = gql`
  mutation UpdateTaxRateFull($id: String!, $input: UpdateTaxRateInput!) {
    updateTaxRate(id: $id, input: $input) {
      id
    }
  }
`;

interface FormState {
  name: string;
  code: string;
  rate: string;
  taxType: TaxType;
  country: string;
  state: string;
  isDefault: boolean;
  active: boolean;
}

interface TaxRateRecord {
  id: string;
  name: string;
  code: string | null;
  rate: number;
  taxType: TaxType;
  country: string | null;
  state: string | null;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function taxRateToFormState(t: TaxRateRecord): FormState {
  return {
    name: t.name,
    code: t.code ?? "",
    rate: String(t.rate),
    taxType: t.taxType,
    country: t.country ?? "",
    state: t.state ?? "",
    isDefault: t.isDefault,
    active: t.active,
  };
}

export default function EditTaxRatePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{ taxRate: TaxRateRecord | null }>(EDIT_TAX_RATE_QUERY, {
    variables: { id },
    skip: !id,
  });
  const [updateTaxRate] = useMutation(UPDATE_TAX_RATE_MUTATION, { refetchQueries: ["TaxRates"] });

  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.taxRate && !form) {
      const hydrated = taxRateToFormState(data.taxRate);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(TAX_RATES_LIST_ROUTE, dirty);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (form.rate === "" || Number(form.rate) < 0) {
      setError("Enter a valid rate");
      return;
    }
    setError(null);
    setSubmitError(null);
    setStatus("submitting");
    try {
      await updateTaxRate({
        variables: {
          id,
          input: {
            name: form.name,
            code: form.code || undefined,
            rate: Number(form.rate),
            taxType: form.taxType,
            country: form.country || undefined,
            state: form.state || undefined,
            isDefault: form.isDefault,
            active: form.active,
          },
        },
      });
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(TAX_RATES_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update tax rate";
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

  if (!loading && !data?.taxRate) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Tax Rates", to: TAX_RATES_LIST_ROUTE }, { label: "Not found" }]}
            title="Tax rate not found"
            backLabel="Back to Tax Rates"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form || !data?.taxRate) return null;

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[
            { label: "Products", to: "/products/all" },
            { label: "Tax Rates", to: TAX_RATES_LIST_ROUTE },
            { label: `Edit ${form.name}` },
          ]}
          title="Edit Tax Rate"
          subtitle="Update this tax rate's details"
          backLabel="Back to Tax Rates"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <FormSection title="Overview" description="Read-only summary for this tax rate" index={0}>
          <FormSubsection title="Stats" className="sm:grid-cols-2">
            <FormStat label="Created" value={new Date(data.taxRate.createdAt).toLocaleString()} />
            <FormStat label="Updated" value={new Date(data.taxRate.updatedAt).toLocaleString()} />
          </FormSubsection>
        </FormSection>
        <form id="tax-rate-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Tax Rate Information"
            description="Update the core details for this tax rate"
            index={1}
          >
            <FormSubsection
              title="Basic Information"
              description="Enter the basic details and required information"
            >
              <div className="space-y-1.5">
                <Label htmlFor="tax-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="tax-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-rate">
                  Rate (%)
                  <RequiredMark />
                </Label>
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={form.rate}
                  onChange={(e) => setForm((f) => (f ? { ...f, rate: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tax type</Label>
                <Select
                  value={form.taxType}
                  onValueChange={(v) => setForm((f) => (f ? { ...f, taxType: v as TaxType } : f))}
                >
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-code">Tax code</Label>
                <Input
                  id="tax-code"
                  placeholder="e.g. GST12"
                  value={form.code}
                  onChange={(e) => setForm((f) => (f ? { ...f, code: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-country">Country</Label>
                <Input
                  id="tax-country"
                  placeholder="e.g. India"
                  value={form.country}
                  onChange={(e) => setForm((f) => (f ? { ...f, country: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-state">State</Label>
                <Input
                  id="tax-state"
                  placeholder="e.g. Tamil Nadu"
                  value={form.state}
                  onChange={(e) => setForm((f) => (f ? { ...f, state: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Default"
            description="Control whether this rate is used as the fallback"
            index={2}
          >
            <FormSubsection
              title="Default Settings"
              description="Applied when a product doesn't specify a tax rate"
            >
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="tax-default">Set as default</Label>
                  <p className="text-xs text-muted-foreground">Used when a product doesn&apos;t specify a tax rate.</p>
                </div>
                <Switch
                  id="tax-default"
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, isDefault: v } : f))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="tax-active">Status</Label>
                  <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
                </div>
                <Switch
                  id="tax-active"
                  checked={form.active}
                  onCheckedChange={(active) => setForm((f) => (f ? { ...f, active } : f))}
                />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="tax-rate-form"
          status={status}
          idleLabel="Save changes"
          loadingLabel="Saving…"
          successLabel="Tax rate updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
