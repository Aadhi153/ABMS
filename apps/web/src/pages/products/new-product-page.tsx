import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
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
import { ImageDropzone } from "./image-dropzone";
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const STEPS = [
  { key: "basic", label: "Basic Info" },
  { key: "pricing", label: "Pricing & Tax" },
  { key: "inventory", label: "Inventory" },
] as const;

/** Small clickable stepper: already-visited steps can be revisited (forward or back),
 * steps beyond the furthest one reached are locked until Next unlocks them. Kept neutral
 * (foreground/border/muted only) to match the footer buttons' flat, no-fill styling. */
function ProductStepIndicator({
  currentStep,
  maxVisitedStep,
  onStepClick,
}: {
  currentStep: number;
  maxVisitedStep: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <nav aria-label="Form steps" className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < currentStep;
        const current = i === currentStep;
        const reachable = i <= maxVisitedStep;
        return (
          <div key={s.key} className="flex items-center">
            {i > 0 && (
              <div className={cn("h-px w-6 sm:w-10", i <= maxVisitedStep ? "bg-foreground/30" : "bg-border")} />
            )}
            <button
              type="button"
              onClick={() => reachable && onStepClick(i)}
              disabled={!reachable}
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1.5 text-sm transition-colors duration-150 ease-out",
                reachable && !current && "cursor-pointer hover:bg-muted",
                !reachable && "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  current && "bg-foreground text-background",
                  done && "border border-foreground/40 text-foreground",
                  !current && !done && "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={cn("font-medium", current ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

const PRODUCT_FORM_OPTIONS_QUERY = gql`
  query ProductFormOptions {
    categories {
      id
      name
    }
    brands {
      id
      name
    }
    taxRates {
      id
      name
      rate
    }
  }
`;

const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
    }
  }
`;

const EMPTY_FORM = {
  sku: "",
  name: "",
  variantName: "",
  description: "",
  barcode: "",
  imageUrl: "",
  categoryId: "",
  brandId: "",
  taxRateId: "",
  unitOfMeasure: "unit",
  costPrice: "",
  sellPrice: "",
  trackInventory: true,
  initialStock: "",
  reorderThreshold: "0",
};

export default function NewProductPage() {
  const { data } = useQuery<{
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    taxRates: Array<{ id: string; name: string; rate: number }>;
  }>(PRODUCT_FORM_OPTIONS_QUERY);
  const [createProduct] = useMutation(CREATE_PRODUCT_MUTATION, {
    refetchQueries: ["AllProducts"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [costPriceError, setCostPriceError] = useState<string | null>(null);
  const [sellPriceError, setSellPriceError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    "/products/all",
    dirty,
  );

  /** Only steps 0 (Basic Info) and 1 (Pricing & Tax) have required fields; Inventory and
   * Media are all-optional, so Next always passes through them. */
  function validateStep(index: number): boolean {
    if (index === 0) {
      const skuInvalid = !form.sku.trim();
      const nameInvalid = !form.name.trim();
      setSkuError(skuInvalid ? "SKU is required" : null);
      setNameError(nameInvalid ? "Name is required" : null);
      return !skuInvalid && !nameInvalid;
    }
    if (index === 1) {
      const costInvalid = form.costPrice === "" || Number(form.costPrice) < 0;
      const sellInvalid = form.sellPrice === "" || Number(form.sellPrice) < 0;
      setCostPriceError(costInvalid ? "Cost price is required" : null);
      setSellPriceError(sellInvalid ? "Sell price is required" : null);
      return !costInvalid && !sellInvalid;
    }
    return true;
  }

  function goToStep(index: number) {
    if (index > maxVisitedStep || status !== "idle") return;
    setStep(index);
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step < STEPS.length - 1) {
      if (!validateStep(step)) return;
      const next = step + 1;
      setStep(next);
      setMaxVisitedStep((m) => Math.max(m, next));
      return;
    }

    // Final step: re-validate every required step in case the user revisited and changed
    // an earlier answer via the step indicator without passing through Next again.
    const basicValid = validateStep(0);
    const pricingValid = validateStep(1);
    if (!basicValid || !pricingValid) {
      setStep(basicValid ? 1 : 0);
      return;
    }
    setSubmitError(null);
    setStatus("submitting");
    try {
      await createProduct({
        variables: {
          input: {
            sku: form.sku,
            name: form.name,
            variantName: form.variantName || undefined,
            description: form.description || undefined,
            barcode: form.barcode || undefined,
            imageUrl: form.imageUrl || undefined,
            categoryId: form.categoryId || undefined,
            brandId: form.brandId || undefined,
            taxRateId: form.taxRateId || undefined,
            unitOfMeasure: form.unitOfMeasure || undefined,
            costPrice: Number(form.costPrice),
            sellPrice: Number(form.sellPrice),
            trackInventory: form.trackInventory,
            initialStock: form.initialStock
              ? Number(form.initialStock)
              : undefined,
            reorderThreshold: form.reorderThreshold
              ? Number(form.reorderThreshold)
              : undefined,
          },
        },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo("/products/all"));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create product";
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
            { label: "All Products", to: "/products/all" },
            { label: "New Product" },
          ]}
          title="Create Product"
          subtitle="Add a new product to your catalog"
          backLabel="Back to Products"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <ProductStepIndicator currentStep={step} maxVisitedStep={maxVisitedStep} onStepClick={goToStep} />
        <FormErrorBanner message={submitError} />
        <form id="product-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          {step === 0 && (
          <div className="space-y-6">
          <FormSection
            title="Product Information"
            description="Core identity and catalog details"
            index={0}
          >
            <FormSubsection
              title="Basic Information"
              description="Enter the basic details and required information"
            >
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">
                  SKU
                  <RequiredMark />
                </Label>
                <Input
                  id="p-sku"
                  required
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={skuError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="p-name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={nameError} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-variant">Variant name</Label>
                <Input
                  id="p-variant"
                  placeholder="e.g. 128GB, Red, Large"
                  value={form.variantName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, variantName: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  placeholder="Optional short description"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select
                  value={form.brandId}
                  onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}
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
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Media"
            description="Add a product image"
            index={1}
          >
            <FormSubsection
              title="Product Image"
              description="Shown in the catalog and on order documents"
            >
              <div className="sm:col-span-2">
                <ImageDropzone
                  label="Product image"
                  value={form.imageUrl}
                  onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
                />
              </div>
            </FormSubsection>
          </FormSection>
          </div>
          )}

          {step === 1 && (
          <FormSection
            title="Pricing & Tax"
            description="Set cost, sell price and applicable tax"
            index={0}
          >
            <FormSubsection
              title="Price Details"
              description="Cost, margin and tax rate for this product"
            >
              <div className="space-y-1.5">
                <Label htmlFor="p-cost">
                  Cost price
                  <RequiredMark />
                </Label>
                <Input
                  id="p-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.costPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, costPrice: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={costPriceError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sell">
                  Sell price
                  <RequiredMark />
                </Label>
                <Input
                  id="p-sell"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.sellPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sellPrice: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={sellPriceError} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tax rate</Label>
                <Select
                  value={form.taxRateId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, taxRateId: v }))
                  }
                >
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="No tax rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.taxRates ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSubsection>
          </FormSection>
          )}

          {step === 2 && (
          <FormSection
            title="Inventory"
            description="Stock tracking and reorder settings"
            index={0}
          >
            <FormSubsection
              title="Stock Settings"
              description="Unit, barcode and reorder thresholds"
            >
              <div className="space-y-1.5">
                <Label htmlFor="p-uom">Unit of measure</Label>
                <Input
                  id="p-uom"
                  value={form.unitOfMeasure}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-barcode">Barcode</Label>
                <Input
                  id="p-barcode"
                  placeholder="Optional"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, barcode: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-initial-stock">Initial stock</Label>
                <Input
                  id="p-initial-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.initialStock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, initialStock: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-reorder">Reorder threshold</Label>
                <Input
                  id="p-reorder"
                  type="number"
                  min="0"
                  value={form.reorderThreshold}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reorderThreshold: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="p-track">Track inventory</Label>
                  <p className="text-xs text-muted-foreground">
                    Deduct stock automatically on sales and purchases.
                  </p>
                </div>
                <Switch
                  id="p-track"
                  checked={form.trackInventory}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, trackInventory: v }))
                  }
                />
              </div>
            </FormSubsection>
          </FormSection>
          )}
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="sm" />
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={status !== "idle" || leaving}
            className={BUTTON_PRESS}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            type="submit"
            form="product-form"
            variant="outline"
            size="sm"
            disabled={status !== "idle" || leaving}
            className={BUTTON_PRESS}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <FormSubmitButton
            formId="product-form"
            status={status}
            size="sm"
            idleLabel="Create Product"
            loadingLabel="Creating…"
            successLabel="Product created"
            disabled={leaving}
          />
        )}
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
