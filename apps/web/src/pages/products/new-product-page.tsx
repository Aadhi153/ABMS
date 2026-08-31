import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Check, ChevronLeft, ChevronRight, Image, PackageCheck } from "lucide-react";
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
  { key: "details", label: "Product Details" },
  { key: "pricing", label: "Pricing" },
  { key: "inventory", label: "Inventory" },
  { key: "review", label: "Review" },
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
              <div className="relative h-px w-6 overflow-hidden bg-border sm:w-10">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 bg-foreground/30 transition-all duration-[250ms] ease-out",
                    i <= maxVisitedStep ? "w-full" : "w-0",
                  )}
                />
              </div>
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
    warehouses {
      id
      name
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
  hsnSacCode: "",
  unitOfMeasure: "unit",
  costPrice: "",
  sellPrice: "",
  salePrice: "",
  warehouseId: "",
  trackInventory: true,
  initialStock: "",
  reorderThreshold: "0",
  active: true,
};

export default function NewProductPage() {
  const { data } = useQuery<{
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    taxRates: Array<{ id: string; name: string; rate: number }>;
    warehouses: Array<{ id: string; name: string }>;
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

  /** Required fields live on the Product Details (step 0) and Pricing (step 1) steps —
   * each gets its own gate so Next won't advance past a step with a missing required
   * field, and the final submit re-checks both and jumps back to whichever is invalid
   * rather than always assuming step 0 like it could when everything lived on one step. */
  function validateDetails(): boolean {
    const skuInvalid = !form.sku.trim();
    const nameInvalid = !form.name.trim();
    setSkuError(skuInvalid ? "SKU is required" : null);
    setNameError(nameInvalid ? "Name is required" : null);
    return !skuInvalid && !nameInvalid;
  }

  function validatePricing(): boolean {
    const costInvalid = form.costPrice === "" || Number(form.costPrice) < 0;
    const sellInvalid = form.sellPrice === "" || Number(form.sellPrice) < 0;
    setCostPriceError(costInvalid ? "Cost price is required" : null);
    setSellPriceError(sellInvalid ? "Price is required" : null);
    return !costInvalid && !sellInvalid;
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
      if (step === 0 && !validateDetails()) return;
      if (step === 1 && !validatePricing()) return;
      const next = step + 1;
      setStep(next);
      setMaxVisitedStep((m) => Math.max(m, next));
      return;
    }

    const detailsValid = validateDetails();
    const pricingValid = validatePricing();
    if (!detailsValid) {
      setStep(0);
      return;
    }
    if (!pricingValid) {
      setStep(1);
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
            active: form.active,
            warehouseId: form.warehouseId || undefined,
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
              <FormSection
                title="Product"
                description="Primary product information used in listings and transactions"
                index={0}
              >
                <FormSubsection
                  title="Identity"
                  description="Name, codes, and lookups used to find this product"
                >
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="p-name">
                      Product Name
                      <RequiredMark />
                    </Label>
                    <Input
                      id="p-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                    <FieldError message={nameError} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-sku">
                      SKU
                      <RequiredMark />
                    </Label>
                    <Input
                      id="p-sku"
                      required
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                    <FieldError message={skuError} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-hsn">HSN/SAC Code</Label>
                    <Input
                      id="p-hsn"
                      value={form.hsnSacCode}
                      onChange={(e) => setForm((f) => ({ ...f, hsnSacCode: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-barcode">Barcode</Label>
                    <Input
                      id="p-barcode"
                      value={form.barcode}
                      onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                  </div>
                </FormSubsection>

                <FormSubsection
                  title="Classification"
                  description="Grouping, variant options, and description shown in the catalog"
                >
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
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
                    <Select value={form.brandId} onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}>
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="p-variant">Variant options</Label>
                    <Input
                      id="p-variant"
                      placeholder="128GB, Red, Large"
                      value={form.variantName}
                      onChange={(e) => setForm((f) => ({ ...f, variantName: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional — e.g. sizes, colors, or configurations, comma-separated.
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="p-desc">Description</Label>
                    <Textarea
                      id="p-desc"
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                  </div>
                </FormSubsection>

                <FormSubsection
                  title="Media"
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
          )}

          {step === 1 && (
              <FormSection
                title="Pricing"
                description="Cost, selling price, optional sale price, and tax setup"
                index={0}
              >
                <FormSubsection
                  title="Pricing Details"
                  description="What this product costs you and what it sells for"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="p-cost">
                      Cost
                      <RequiredMark />
                    </Label>
                    <Input
                      id="p-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.costPrice}
                      onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                    <FieldError message={costPriceError} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-sell">
                      Price
                      <RequiredMark />
                    </Label>
                    <Input
                      id="p-sell"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.sellPrice}
                      onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                    <FieldError message={sellPriceError} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-sale">Sale Price</Label>
                    <Input
                      id="p-sale"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.salePrice}
                      onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tax Rate</Label>
                    <Select value={form.taxRateId} onValueChange={(v) => setForm((f) => ({ ...f, taxRateId: v }))}>
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
                description="Opening stock, warehouse, minimum stock, unit, and product status"
                index={0}
              >
                <FormSubsection
                  title="Stock"
                  description="Where this product is held and when to reorder"
                >
                  <div className="space-y-1.5">
                    <Label>Warehouse</Label>
                    <Select value={form.warehouseId} onValueChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}>
                      <SelectTrigger className={FOCUS_GLOW}>
                        <SelectValue placeholder="Default warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {(data?.warehouses ?? []).map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-initial-stock">Stock Quantity</Label>
                    <Input
                      id="p-initial-stock"
                      type="number"
                      min="0"
                      value={form.initialStock}
                      onChange={(e) => setForm((f) => ({ ...f, initialStock: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-reorder">Min Stock</Label>
                    <Input
                      id="p-reorder"
                      type="number"
                      min="0"
                      value={form.reorderThreshold}
                      onChange={(e) => setForm((f) => ({ ...f, reorderThreshold: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-uom">UOM</Label>
                    <Input
                      id="p-uom"
                      value={form.unitOfMeasure}
                      onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))}
                      className={FOCUS_GLOW}
                    />
                  </div>
                </FormSubsection>

                <FormSubsection
                  title="Status & Tracking"
                  description="Whether stock moves automatically and if this product is active"
                >
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                    <div>
                      <Label htmlFor="p-track">Track Inventory</Label>
                      <p className="text-xs text-muted-foreground">Stock moves with sales and purchases.</p>
                    </div>
                    <Switch id="p-track" checked={form.trackInventory} onCheckedChange={(v) => setForm((f) => ({ ...f, trackInventory: v }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                    <div>
                      <Label htmlFor="p-active">Status</Label>
                      <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
                    </div>
                    <Switch id="p-active" checked={form.active} onCheckedChange={(active) => setForm((f) => ({ ...f, active }))} />
                  </div>
                </FormSubsection>
              </FormSection>
          )}

          {step === 3 && (
            <FormSection title="Review" description="Confirm product details before creating" index={0}>
              <FormSubsection title="Product" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Product Name", form.name],
                  ["SKU", form.sku],
                  ["HSN/SAC Code", form.hsnSacCode],
                  ["Category", data?.categories.find((c) => c.id === form.categoryId)?.name],
                  ["Brand", data?.brands.find((b) => b.id === form.brandId)?.name],
                  ["Variant Options", form.variantName],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border px-3 py-2">
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 min-h-5 truncate text-sm font-medium text-foreground">{value || "-"}</p>
                  </div>
                ))}
              </FormSubsection>
              <FormSubsection title="Pricing" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Cost", form.costPrice],
                  ["Price", form.sellPrice],
                  ["Sale Price", form.salePrice],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border px-3 py-2">
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 min-h-5 truncate text-sm font-medium text-foreground">{value || "-"}</p>
                  </div>
                ))}
              </FormSubsection>
              <FormSubsection title="Inventory" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Warehouse", data?.warehouses.find((w) => w.id === form.warehouseId)?.name],
                  ["Stock Quantity", form.initialStock],
                  ["Min Stock", form.reorderThreshold],
                  ["UOM", form.unitOfMeasure],
                  ["Status", form.active ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border px-3 py-2">
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 min-h-5 truncate text-sm font-medium text-foreground">{value || "-"}</p>
                  </div>
                ))}
              </FormSubsection>
              <FormSubsection title="Readiness" className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                  <PackageCheck className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Inventory</p>
                    <p className="text-xs text-muted-foreground">{form.trackInventory ? "Tracked" : "Not tracked"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                  <Image className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Media</p>
                    <p className="text-xs text-muted-foreground">{form.imageUrl ? "Image attached" : "No image"}</p>
                  </div>
                </div>
              </FormSubsection>
            </FormSection>
          )}
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            size="xs"
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
            size="xs"
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
            size="xs"
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
