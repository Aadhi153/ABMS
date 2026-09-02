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
  FormStat,
  RequiredMark,
  useDiscardGuard,
  type SubmitStatus,
} from "./form-page";
import { FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const DISCOUNTS_LIST_ROUTE = "/products/discounts";

type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
type AppliesTo = "ALL" | "CATEGORY" | "BRAND";

const EDIT_DISCOUNT_QUERY = gql`
  query EditDiscountData($id: String!) {
    discount(id: $id) {
      id
      name
      type
      value
      appliesTo
      category {
        id
      }
      brand {
        id
      }
      startDate
      endDate
      usageLimit
      usageCount
      minPurchaseAmount
      minQuantity
      couponCode
      active
      createdAt
      updatedAt
    }
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

const UPDATE_DISCOUNT_MUTATION = gql`
  mutation UpdateDiscountFull($id: String!, $input: UpdateDiscountInput!) {
    updateDiscount(id: $id, input: $input) {
      id
    }
  }
`;

interface FormState {
  name: string;
  type: DiscountType;
  value: string;
  appliesTo: AppliesTo;
  categoryId: string;
  brandId: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  minPurchaseAmount: string;
  minQuantity: string;
  couponCode: string;
  active: boolean;
}

interface DiscountRecord {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  appliesTo: AppliesTo;
  category: { id: string } | null;
  brand: { id: string } | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usageCount: number;
  minPurchaseAmount: number | null;
  minQuantity: number | null;
  couponCode: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function discountToFormState(d: DiscountRecord): FormState {
  return {
    name: d.name,
    type: d.type,
    value: String(d.value),
    appliesTo: d.appliesTo,
    categoryId: d.category?.id ?? "",
    brandId: d.brand?.id ?? "",
    startDate: toDateInputValue(d.startDate),
    endDate: toDateInputValue(d.endDate),
    usageLimit: d.usageLimit != null ? String(d.usageLimit) : "",
    minPurchaseAmount: d.minPurchaseAmount != null ? String(d.minPurchaseAmount) : "",
    minQuantity: d.minQuantity != null ? String(d.minQuantity) : "",
    couponCode: d.couponCode ?? "",
    active: d.active,
  };
}

export default function EditDiscountPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{
    discount: DiscountRecord | null;
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
  }>(EDIT_DISCOUNT_QUERY, { variables: { id }, skip: !id });
  const [updateDiscount] = useMutation(UPDATE_DISCOUNT_MUTATION, { refetchQueries: ["Discounts"] });

  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.discount && !form) {
      const hydrated = discountToFormState(data.discount);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(DISCOUNTS_LIST_ROUTE, dirty);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
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
      await updateDiscount({
        variables: {
          id,
          input: {
            name: form.name,
            type: form.type,
            value: Number(form.value),
            appliesTo: form.appliesTo,
            categoryId: form.appliesTo === "CATEGORY" ? form.categoryId || undefined : undefined,
            brandId: form.appliesTo === "BRAND" ? form.brandId || undefined : undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
            minPurchaseAmount: form.minPurchaseAmount ? Number(form.minPurchaseAmount) : undefined,
            minQuantity: form.minQuantity ? Number(form.minQuantity) : undefined,
            couponCode: form.couponCode || undefined,
            active: form.active,
          },
        },
      });
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(DISCOUNTS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update discount";
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

  if (!loading && !data?.discount) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Discounts", to: DISCOUNTS_LIST_ROUTE }, { label: "Not found" }]}
            title="Discount not found"
            backLabel="Back to Discounts"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form || !data?.discount) return null;

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[
            { label: "Products", to: "/products/all" },
            { label: "Discounts", to: DISCOUNTS_LIST_ROUTE },
            { label: `Edit ${form.name}` },
          ]}
          title="Edit Discount"
          subtitle="Update this promotional discount scheme"
          backLabel="Back to Discounts"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <FormSection title="Overview" description="Read-only summary for this discount" index={0}>
          <FormSubsection title="Stats" className="sm:grid-cols-3">
            <FormStat label="Usage" value={`${data.discount.usageCount} used`} />
            <FormStat label="Created" value={new Date(data.discount.createdAt).toLocaleString()} />
            <FormStat label="Updated" value={new Date(data.discount.updatedAt).toLocaleString()} />
          </FormSubsection>
        </FormSection>
        <form id="discount-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Discount Information"
            description="Update the core details for this discount"
            index={1}
          >
            <FormSubsection title="Basic Information" description="Name, type and value">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="disc-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="disc-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <div className="inline-flex rounded-md bg-muted p-1">
                  {[
                    { key: "PERCENTAGE" as DiscountType, label: "Percentage" },
                    { key: "FIXED_AMOUNT" as DiscountType, label: "Fixed amount" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm((f) => (f ? { ...f, type: opt.key } : f))}
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
                  onChange={(e) => setForm((f) => (f ? { ...f, value: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection title="Scope" description="Choose what this discount applies to" index={2}>
            <FormSubsection title="Applies To" description="All products, or a single category or brand">
              <div className="space-y-1.5">
                <Label>Applies to</Label>
                <Select
                  value={form.appliesTo}
                  onValueChange={(v) => setForm((f) => (f ? { ...f, appliesTo: v as AppliesTo } : f))}
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
                    onValueChange={(v) => setForm((f) => (f ? { ...f, categoryId: v } : f))}
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
                    onValueChange={(v) => setForm((f) => (f ? { ...f, brandId: v } : f))}
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

          <FormSection title="Validity & Limits" description="Optional schedule and usage limits" index={3}>
            <FormSubsection title="Schedule & Usage" description="Date range, usage cap and coupon code">
              <div className="space-y-1.5">
                <Label htmlFor="disc-start">Start date</Label>
                <Input
                  id="disc-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => (f ? { ...f, startDate: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-end">End date</Label>
                <Input
                  id="disc-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => (f ? { ...f, endDate: e.target.value } : f))}
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
                  onChange={(e) => setForm((f) => (f ? { ...f, usageLimit: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-coupon">Coupon code</Label>
                <Input
                  id="disc-coupon"
                  placeholder="Optional"
                  value={form.couponCode}
                  onChange={(e) => setForm((f) => (f ? { ...f, couponCode: e.target.value.toUpperCase() } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-min-purchase">Min purchase amount</Label>
                <Input
                  id="disc-min-purchase"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="No minimum"
                  value={form.minPurchaseAmount}
                  onChange={(e) => setForm((f) => (f ? { ...f, minPurchaseAmount: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc-min-qty">Min quantity</Label>
                <Input
                  id="disc-min-qty"
                  type="number"
                  min="1"
                  placeholder="No minimum"
                  value={form.minQuantity}
                  onChange={(e) => setForm((f) => (f ? { ...f, minQuantity: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="disc-active">Status</Label>
                  <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
                </div>
                <Switch
                  id="disc-active"
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
          formId="discount-form"
          status={status}
          idleLabel="Save changes"
          loadingLabel="Saving…"
          successLabel="Discount updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
