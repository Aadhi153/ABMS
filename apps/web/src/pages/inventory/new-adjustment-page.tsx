import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ClipboardEdit } from "lucide-react";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@abms/ui";
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
} from "../products/form-page";
import { FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";

const ADJUSTMENTS_LIST_ROUTE = "/inventory/adjustments";

const OPTIONS_QUERY = gql`
  query InventoryAdjustOptions {
    products {
      id
      sku
      name
    }
    warehouses {
      id
      name
      active
    }
  }
`;

const ADJUST_STOCK_MUTATION = gql`
  mutation AdjustStock($input: StockAdjustmentInput!) {
    adjustStock(input: $input) {
      id
    }
  }
`;

const EMPTY_FORM = { productId: "", warehouseId: "", quantity: "", reason: "" };

export default function NewAdjustmentPage() {
  const { data } = useQuery<{
    products: Array<{ id: string; sku: string; name: string }>;
    warehouses: Array<{ id: string; name: string; active: boolean }>;
  }>(OPTIONS_QUERY);
  const [adjustStock] = useMutation(ADJUST_STOCK_MUTATION, { refetchQueries: ["InventoryProducts", "StockAdjustments"] });

  const [form, setForm] = useState(EMPTY_FORM);
  const [productError, setProductError] = useState<string | null>(null);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    ADJUSTMENTS_LIST_ROUTE,
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const productInvalid = !form.productId;
    const warehouseInvalid = !form.warehouseId;
    const quantityInvalid = form.quantity === "" || Number(form.quantity) === 0;
    const reasonInvalid = !form.reason.trim();
    setProductError(productInvalid ? "Select a product" : null);
    setWarehouseError(warehouseInvalid ? "Select a warehouse" : null);
    setQuantityError(quantityInvalid ? "Enter a non-zero quantity" : null);
    setReasonError(reasonInvalid ? "Reason is required" : null);
    if (productInvalid || warehouseInvalid || quantityInvalid || reasonInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await adjustStock({
        variables: {
          input: {
            productId: form.productId,
            warehouseId: form.warehouseId,
            quantity: Number(form.quantity),
            reason: form.reason,
          },
        },
      });
      toast.success("Stock adjusted");
      setStatus("success");
      holdSuccessThen(() => exitTo(ADJUSTMENTS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to adjust stock";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Inventory", to: "/inventory" }, { label: "Adjustments", to: ADJUSTMENTS_LIST_ROUTE }, { label: "New Adjustment" }]}
          title="New Stock Adjustment"
          subtitle="Manually correct stock on hand for a product at a warehouse"
          backLabel="Back to Adjustments"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="adjustment-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Adjustment"
            description="Product, location, and quantity change"
            icon={<ClipboardEdit className="h-5 w-5" />}
            index={0}
          >
            <FormSubsection title="Details" description="Use a negative quantity to remove stock">
              <div className="space-y-1.5">
                <Label>
                  Product
                  <RequiredMark />
                </Label>
                <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.products ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={productError} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Warehouse
                  <RequiredMark />
                </Label>
                <Select value={form.warehouseId} onValueChange={(v) => setForm((f) => ({ ...f, warehouseId: v }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.warehouses ?? []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={warehouseError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-qty">
                  Quantity
                  <RequiredMark />
                </Label>
                <Input
                  id="qa-qty"
                  type="number"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={quantityError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-reason">
                  Reason
                  <RequiredMark />
                </Label>
                <Input
                  id="qa-reason"
                  required
                  placeholder="e.g. Cycle count correction, damaged stock"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={reasonError} />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="adjustment-form"
          status={status}
          idleLabel="Apply Adjustment"
          loadingLabel="Saving…"
          successLabel="Adjustment applied"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
