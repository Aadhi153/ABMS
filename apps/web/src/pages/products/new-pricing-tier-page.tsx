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
  Textarea,
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

const CREATE_PRICING_TIER_MUTATION = gql`
  mutation CreatePricingTier($input: CreatePricingTierInput!) {
    createPricingTier(input: $input) {
      id
    }
  }
`;

const CUSTOMER_TAGS = [
  { value: "REGULAR", label: "Regular" },
  { value: "ONE_TIME", label: "One-time" },
  { value: "LEAD", label: "Lead" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  discountPercent: "",
  minOrderValue: "",
  customerTag: "",
};

export default function NewPricingTierPage() {
  const [createPricingTier] = useMutation(CREATE_PRICING_TIER_MUTATION, {
    refetchQueries: ["PricingTiers"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    "/products/pricingtiers",
    dirty,
  );

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
      await createPricingTier({
        variables: {
          input: {
            name: form.name,
            description: form.description || undefined,
            discountPercent: form.discountPercent
              ? Number(form.discountPercent)
              : undefined,
            minOrderValue: form.minOrderValue
              ? Number(form.minOrderValue)
              : undefined,
            customerTag: form.customerTag || undefined,
          },
        },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo("/products/pricingtiers"));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create pricing tier";
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
            { label: "Pricing Tiers", to: "/products/pricingtiers" },
            { label: "New Pricing Tier" },
          ]}
          title="Create Pricing Tier"
          subtitle="Define a new pricing tier and its discount rules"
          backLabel="Back to Pricing Tiers"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form
          id="pricing-tier-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <FormSection
            title="Pricing Tier Information"
            description="Enter the core details for this tier"
            index={0}
          >
            <FormSubsection
              title="Basic Information"
              description="Name and description"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tier-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="tier-name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tier-desc">Description</Label>
                <Textarea
                  id="tier-desc"
                  placeholder="e.g. Retail vs. Wholesale pricing"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Rules"
            description="Discount and eligibility rules for this tier"
            index={1}
          >
            <FormSubsection
              title="Discount Rules"
              description="How much this tier discounts and who it applies to"
            >
              <div className="space-y-1.5">
                <Label htmlFor="tier-discount">Discount (%)</Label>
                <Input
                  id="tier-discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountPercent: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-min-order">Minimum order value</Label>
                <Input
                  id="tier-min-order"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minOrderValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minOrderValue: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Applies to customer tag</Label>
                <Select
                  value={form.customerTag || "all"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      customerTag: v === "all" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {CUSTOMER_TAGS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="pricing-tier-form"
          status={status}
          idleLabel="Create Tier"
          loadingLabel="Creating tier…"
          successLabel="Tier created"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
