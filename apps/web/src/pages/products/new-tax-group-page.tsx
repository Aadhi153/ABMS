import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Input, Label, toast } from "@abms/ui";
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

const TAX_RATES_QUERY = gql`
  query TaxRatesForGroupPicker {
    taxRates {
      id
      name
      rate
    }
  }
`;

const CREATE_TAX_GROUP_MUTATION = gql`
  mutation CreateTaxGroup($input: CreateTaxGroupInput!) {
    createTaxGroup(input: $input) {
      id
    }
  }
`;

interface TaxRateOption {
  id: string;
  name: string;
  rate: number;
}

const EMPTY_FORM = {
  name: "",
  taxRateIds: [] as string[],
};

export default function NewTaxGroupPage() {
  const { data } = useQuery<{ taxRates: TaxRateOption[] }>(TAX_RATES_QUERY);
  const [createTaxGroup] = useMutation(CREATE_TAX_GROUP_MUTATION, {
    refetchQueries: ["TaxGroups"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    "/products/taxgroups",
    dirty,
  );

  const taxRates = data?.taxRates ?? [];

  function toggleRate(id: string) {
    setForm((f) => ({
      ...f,
      taxRateIds: f.taxRateIds.includes(id)
        ? f.taxRateIds.filter((r) => r !== id)
        : [...f.taxRateIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSubmitError(null);
    setStatus("submitting");
    try {
      await createTaxGroup({
        variables: { input: { name: form.name, taxRateIds: form.taxRateIds } },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo("/products/taxgroups"));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create tax group";
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
            { label: "Tax Groups", to: "/products/taxgroups" },
            { label: "New Tax Group" },
          ]}
          title="Create Tax Group"
          subtitle="Bundle multiple tax rates together for composite tax calculations"
          backLabel="Back to Tax Groups"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="tax-group-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Tax Group Information"
            description="Enter the core details for this tax group"
            index={0}
          >
            <FormSubsection
              title="Basic Information"
              description="Enter the basic details and required information"
              className="sm:grid-cols-1"
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
            </FormSubsection>

            <FormSubsection
              title="Tax Rates"
              description="Select the tax rates bundled into this group"
              className="sm:grid-cols-1"
            >
              {taxRates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tax rates available — create one first.
                </p>
              ) : (
                <div className="space-y-1.5 rounded-md border border-border p-3 max-h-60 overflow-y-auto">
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
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="tax-group-form"
          status={status}
          idleLabel="Create Tax Group"
          loadingLabel="Creating tax group…"
          successLabel="Tax group created"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
