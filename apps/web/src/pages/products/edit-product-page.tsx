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
import { ImageDropzone } from "./image-dropzone";
import { FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const PRODUCTS_LIST_ROUTE = "/products/all";

const EDIT_PRODUCT_QUERY = gql`
  query EditProductData($id: String!) {
    product(id: $id) {
      id
      sku
      name
      variantName
      description
      barcode
      imageUrl
      categoryId
      brandId
      taxRateId
      unitOfMeasure
      costPrice
      sellPrice
      trackInventory
      reorderThreshold
      maxStockLevel
      active
    }
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

const UPDATE_PRODUCT_MUTATION = gql`
  mutation UpdateProductFull($id: String!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
    }
  }
`;

interface FormState {
  name: string;
  variantName: string;
  description: string;
  barcode: string;
  imageUrl: string;
  categoryId: string;
  brandId: string;
  taxRateId: string;
  unitOfMeasure: string;
  costPrice: string;
  sellPrice: string;
  trackInventory: boolean;
  reorderThreshold: string;
  maxStockLevel: string;
  active: boolean;
}

interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  variantName: string | null;
  description: string | null;
  barcode: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  brandId: string | null;
  taxRateId: string | null;
  unitOfMeasure: string;
  costPrice: number;
  sellPrice: number;
  trackInventory: boolean;
  reorderThreshold: number;
  maxStockLevel: number | null;
  active: boolean;
}

function productToFormState(p: ProductRecord): FormState {
  return {
    name: p.name,
    variantName: p.variantName ?? "",
    description: p.description ?? "",
    barcode: p.barcode ?? "",
    imageUrl: p.imageUrl ?? "",
    categoryId: p.categoryId ?? "",
    brandId: p.brandId ?? "",
    taxRateId: p.taxRateId ?? "",
    unitOfMeasure: p.unitOfMeasure,
    costPrice: String(p.costPrice),
    sellPrice: String(p.sellPrice),
    trackInventory: p.trackInventory,
    reorderThreshold: String(p.reorderThreshold),
    maxStockLevel: p.maxStockLevel != null ? String(p.maxStockLevel) : "",
    active: p.active,
  };
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{
    product: ProductRecord | null;
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
    taxRates: Array<{ id: string; name: string; rate: number }>;
  }>(EDIT_PRODUCT_QUERY, { variables: { id }, skip: !id });
  const [updateProduct] = useMutation(UPDATE_PRODUCT_MUTATION, { refetchQueries: ["AllProducts", "ProductDetail"] });

  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [costPriceError, setCostPriceError] = useState<string | null>(null);
  const [sellPriceError, setSellPriceError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.product && !form) {
      const hydrated = productToFormState(data.product);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(PRODUCTS_LIST_ROUTE, dirty);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    const nameInvalid = !form.name.trim();
    const costInvalid = form.costPrice === "" || Number(form.costPrice) < 0;
    const sellInvalid = form.sellPrice === "" || Number(form.sellPrice) < 0;
    setNameError(nameInvalid ? "Name is required" : null);
    setCostPriceError(costInvalid ? "Cost price is required" : null);
    setSellPriceError(sellInvalid ? "Price is required" : null);
    if (nameInvalid || costInvalid || sellInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await updateProduct({
        variables: {
          id,
          input: {
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
            reorderThreshold: form.reorderThreshold ? Number(form.reorderThreshold) : undefined,
            maxStockLevel: form.maxStockLevel ? Number(form.maxStockLevel) : undefined,
            active: form.active,
          },
        },
      });
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(PRODUCTS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update product";
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

  if (!loading && !data?.product) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Products", to: PRODUCTS_LIST_ROUTE }, { label: "Not found" }]}
            title="Product not found"
            backLabel="Back to Products"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form || !data?.product) return null;

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[
            { label: "Products", to: PRODUCTS_LIST_ROUTE },
            { label: "All Products", to: PRODUCTS_LIST_ROUTE },
            { label: `Edit ${form.name}` },
          ]}
          title="Edit Product"
          subtitle="Update this product's catalog, pricing, and inventory settings"
          backLabel="Back to Products"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="product-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Product"
            description="Primary product information used in listings and transactions"
            index={0}
          >
            <FormSubsection title="Identity" description="Name, codes, and lookups used to find this product">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-name">
                  Product Name
                  <RequiredMark />
                </Label>
                <Input
                  id="p-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={nameError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">SKU</Label>
                <Input id="p-sku" disabled value={data.product.sku} className={FOCUS_GLOW} />
                <p className="text-xs text-muted-foreground">SKU can't be changed after creation</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-barcode">Barcode</Label>
                <Input
                  id="p-barcode"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => (f ? { ...f, barcode: e.target.value } : f))}
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
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select value={form.brandId} onValueChange={(v) => setForm((f) => (f ? { ...f, brandId: v } : f))}>
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
                  onChange={(e) => setForm((f) => (f ? { ...f, variantName: e.target.value } : f))}
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
                  onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>

            <FormSubsection title="Media" description="Shown in the catalog and on order documents">
              <div className="sm:col-span-2">
                <ImageDropzone
                  label="Product image"
                  value={form.imageUrl}
                  onChange={(imageUrl) => setForm((f) => (f ? { ...f, imageUrl } : f))}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection title="Pricing" description="Cost, selling price, and tax setup" index={1}>
            <FormSubsection title="Pricing Details" description="What this product costs you and what it sells for">
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
                  onChange={(e) => setForm((f) => (f ? { ...f, costPrice: e.target.value } : f))}
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
                  onChange={(e) => setForm((f) => (f ? { ...f, sellPrice: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={sellPriceError} />
              </div>
              <div className="space-y-1.5">
                <Label>Tax Rate</Label>
                <Select
                  value={form.taxRateId}
                  onValueChange={(v) => setForm((f) => (f ? { ...f, taxRateId: v } : f))}
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

          <FormSection
            title="Inventory"
            description="Minimum/maximum stock, unit, and product status"
            index={2}
          >
            <FormSubsection title="Stock Thresholds" description="When to reorder and how this product is tracked">
              <div className="space-y-1.5">
                <Label htmlFor="p-uom">UOM</Label>
                <Input
                  id="p-uom"
                  value={form.unitOfMeasure}
                  onChange={(e) => setForm((f) => (f ? { ...f, unitOfMeasure: e.target.value } : f))}
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
                  onChange={(e) => setForm((f) => (f ? { ...f, reorderThreshold: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-max-stock">Max Stock</Label>
                <Input
                  id="p-max-stock"
                  type="number"
                  min="0"
                  placeholder="No limit"
                  value={form.maxStockLevel}
                  onChange={(e) => setForm((f) => (f ? { ...f, maxStockLevel: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>

            <FormSubsection title="Status & Tracking" description="Whether stock moves automatically and if this product is active">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <Label htmlFor="p-track">Track Inventory</Label>
                  <p className="text-xs text-muted-foreground">Stock moves with sales and purchases.</p>
                </div>
                <Switch
                  id="p-track"
                  checked={form.trackInventory}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, trackInventory: v } : f))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <Label htmlFor="p-active">Status</Label>
                  <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
                </div>
                <Switch
                  id="p-active"
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
          formId="product-form"
          status={status}
          idleLabel="Save changes"
          loadingLabel="Saving…"
          successLabel="Product updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
