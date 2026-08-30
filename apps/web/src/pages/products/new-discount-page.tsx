import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
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

const SCOPE_OPTIONS_QUERY = gql`
  query DiscountScopeOptions {
    categories {
      id
      name
    }
    brands {
      id
      name
    }
  }
`;

const CREATE_DISCOUNT_MUTATION = gql`
  mutation CreateDiscount($input: CreateDiscountInput!) {
    createDiscount(input: $input) {
      id
    }
  }
`;

type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
type AppliesTo = "ALL" | "CATEGORY" | "BRAND";

const EMPTY_FORM = {
  name: "",
  type: "PERCENTAGE" as DiscountType,
  value: "",
  appliesTo: "ALL" as AppliesTo,
  categoryId: "",
  brandId: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  couponCode: "",
};

export default function NewDiscountPage() {
  const { data } = useQuery<{
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
  }>(SCOPE_OPTIONS_QUERY);
  const [createDiscount] = useMutation(CREATE_DISCOUNT_MUTATION, {
    refetchQueries: ["Discounts"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    "/products/discounts",
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (form.value === "" || Number(form.value) < 0) {
      setError("Enter a valid value");
      return;
    }
    setError(null);
    setSubmitError(null);
    setStatus("submitting");
    try {
      await createDiscount({
        variables: {
          input: {
            name: form.name,
            type: form.type,
            value: Number(form.value),
            appliesTo: form.appliesTo,
            categoryId:
              form.appliesTo === "CATEGORY"
                ? form.categoryId || undefined
                : undefined,
            brandId:
              form.appliesTo === "BRAND"
                ? form.brandId || undefined
                : undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
            couponCode: form.couponCode || undefined,
          },
        },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo("/products/discounts"));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create discount";
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
            { label: "Discounts", to: "/products/discounts" },
            { label: "New Discount" },
          ]}
          title="Create Discount"
          subtitle="Create a new promotional discount"
          backLabel="Back to Discounts"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="discount-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Discount Information"
            description="Enter the core details for this discount"
            index={0}
          >
            <FormSubsection
              title="Basic Information"
              description="Name, type and value"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="disc-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="disc-name"
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
                <Label>Type</Label>
                <div className="inline-flex rounded-md bg-muted p-1">
                  {[
                    { key: "PERCENTAGE" as DiscountType, label: "Percentage" },
                    {
                      key: "FIXED_AMOUNT" as DiscountType,
                      label: "Fixed amount",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: opt.key }))}
                      className={cn(
                        "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors duration-150 ease-out",
                        form.type === opt.key
                          ? "bg-card font-semibold text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-value">
                  {form.type === "PERCENTAGE" ? "Value (%)" : "Value ($)"}
                  <RequiredMark />
                </Label>
                <Input
                  id="disc-value"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, value: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Scope"
            description="Choose what this discount applies to"
            index={1}
          >
            <FormSubsection
              title="Applies To"
              description="All products, or a single category or brand"
            >
              <div className="space-y-1.5">
                <Label>Applies to</Label>
                <Select
                  value={form.appliesTo}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, appliesTo: v as AppliesTo }))
                  }
                >
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All products</SelectItem>
                    <SelectItem value="CATEGORY">A category</SelectItem>
                    <SelectItem value="BRAND">A brand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.appliesTo === "CATEGORY" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none">
                  <Label>Category</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, categoryId: v }))
                    }
                  >
                    <SelectTrigger className={FOCUS_GLOW}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.categories ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.appliesTo === "BRAND" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none">
                  <Label>Brand</Label>
                  <Select
                    value={form.brandId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, brandId: v }))
                    }
                  >
                    <SelectTrigger className={FOCUS_GLOW}>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.brands ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Validity & Limits"
            description="Optional schedule and usage limits"
            index={2}
          >
            <FormSubsection
              title="Schedule & Usage"
              description="Date range, usage cap and coupon code"
            >
              <div className="space-y-1.5">
                <Label htmlFor="disc-start">Start date</Label>
                <Input
                  id="disc-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-end">End date</Label>
                <Input
                  id="disc-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-usage">Usage limit</Label>
                <Input
                  id="disc-usage"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={form.usageLimit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, usageLimit: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-coupon">Coupon code</Label>
                <Input
                  id="disc-coupon"
                  placeholder="Optional"
                  value={form.couponCode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      couponCode: e.target.value.toUpperCase(),
                    }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} />
        <FormSubmitButton
          formId="discount-form"
          status={status}
          idleLabel="Create Discount"
          loadingLabel="Creating discount…"
          successLabel="Discount created"
          disabled={leaving}
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
