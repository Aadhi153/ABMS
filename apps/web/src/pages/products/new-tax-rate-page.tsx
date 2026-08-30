import { useState, type FormEvent } from "react";
import { gql, useMutation } from "@apollo/client";
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
  RequiredMark,
  useDiscardGuard,
  type SubmitStatus,
} from "./form-page";
import { FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const CREATE_TAX_RATE_MUTATION = gql`
  mutation CreateTaxRate($input: CreateTaxRateInput!) {
    createTaxRate(input: $input) {
      id
    }
  }
`;

const TAX_TYPES = [
  { value: "GST", label: "GST" },
  { value: "VAT", label: "VAT" },
  { value: "SALES_TAX", label: "Sales tax" },
  { value: "OTHER", label: "Other" },
] as const;

const EMPTY_FORM = {
  name: "",
  rate: "",
  taxType: "OTHER" as (typeof TAX_TYPES)[number]["value"],
  region: "",
  isDefault: false,
};

export default function NewTaxRatePage() {
  const [createTaxRate] = useMutation(CREATE_TAX_RATE_MUTATION, {
    refetchQueries: ["TaxRates"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    "/products/taxrates",
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
      await createTaxRate({
        variables: {
          input: {
            name: form.name,
            rate: Number(form.rate),
            taxType: form.taxType,
            region: form.region || undefined,
            isDefault: form.isDefault,
          },
        },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo("/products/taxrates"));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create tax rate";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[
            { label: "Products", to: "/products/all" },
            { label: "Tax Rates", to: "/products/taxrates" },
            { label: "New Tax Rate" },
          ]}
          title="Create Tax Rate"
          subtitle="Add a new tax rate for invoicing and pricing"
          backLabel="Back to Tax Rates"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="tax-rate-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Tax Rate Information"
            description="Enter the core details for this tax rate"
            index={0}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rate: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tax type</Label>
                <Select
                  value={form.taxType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      taxType: v as typeof form.taxType,
                    }))
                  }
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
                <Label htmlFor="tax-region">Region</Label>
                <Input
                  id="tax-region"
                  placeholder="e.g. California, Ontario"
                  value={form.region}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, region: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Default"
            description="Control whether this rate is used as the fallback"
            index={1}
          >
            <FormSubsection
              title="Default Settings"
              description="Applied when a product doesn't specify a tax rate"
            >
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="tax-default">Set as default</Label>
                  <p className="text-xs text-muted-foreground">
                    Used when a product doesn&apos;t specify a tax rate.
                  </p>
                </div>
                <Switch
                  id="tax-default"
                  checked={form.isDefault}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isDefault: v }))
                  }
                />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} />
        <FormSubmitButton
          formId="tax-rate-form"
          status={status}
          idleLabel="Create Tax Rate"
          loadingLabel="Creating tax rate…"
          successLabel="Tax rate created"
          disabled={leaving}
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
