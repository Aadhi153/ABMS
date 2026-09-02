import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Check, ChevronLeft, ChevronRight, ShoppingCart, Trash2 } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn, toast } from "@abms/ui";
import {
  FormPage,
  FormScrollArea,
  FormPageHeader,
  FormSection,
  FormSubsection,
  FormFooter,
  FormErrorBanner,
  FormCancelButton,
  FieldError,
  RequiredMark,
  useDiscardGuard,
} from "../products/form-page";
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";

const ORDERS_LIST_ROUTE = "/sales/orders";

const STEPS = [
  { key: "details", label: "Order Details" },
  { key: "items", label: "Items" },
  { key: "review", label: "Review" },
] as const;

function OrderStepIndicator({
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

const OPTIONS_QUERY = gql`
  query NewSalesOrderOptions {
    customers {
      id
      name
      active
    }
    products {
      id
      sku
      name
      sellPrice
      totalStock
      active
    }
    warehouses {
      id
      name
      active
    }
  }
`;

const CREATE_ORDER = gql`
  mutation CreateSalesOrder($input: CreateSalesOrderInput!) {
    createSalesOrder(input: $input) {
      id
    }
  }
`;
const CONFIRM_ORDER = gql`
  mutation ConfirmSalesOrder($id: String!, $warehouseId: String!) {
    confirmSalesOrder(id: $id, warehouseId: $warehouseId) {
      id
    }
  }
`;

type Item = { productId: string; quantity: number; unitPrice: number };

export default function NewSalesOrderPage() {
  const { data } = useQuery<{
    customers: Array<{ id: string; name: string; active: boolean }>;
    products: Array<{ id: string; sku: string; name: string; sellPrice: number; totalStock: number; active: boolean }>;
    warehouses: Array<{ id: string; name: string; active: boolean }>;
  }>(OPTIONS_QUERY);
  const [createOrder] = useMutation(CREATE_ORDER, { refetchQueries: ["SalesPageData"] });
  const [confirmOrder] = useMutation(CONFIRM_ORDER, { refetchQueries: ["SalesPageData"] });

  const customers = (data?.customers ?? []).filter((c) => c.active !== false);
  const products = (data?.products ?? []).filter((p) => p.active !== false);
  const warehouses = data?.warehouses ?? [];

  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [customerError, setCustomerError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "draft" | "confirm">("idle");
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);

  const dirty = !!customerId || items.length > 0;
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    ORDERS_LIST_ROUTE,
    dirty,
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  function validateDetails(): boolean {
    const invalid = !customerId;
    setCustomerError(invalid ? "Select a customer" : null);
    return !invalid;
  }

  function validateItems(): boolean {
    const invalid = items.length === 0;
    setItemsError(invalid ? "Add at least one item" : null);
    return !invalid;
  }

  function addItem() {
    const product = products.find((p) => p.id === productId);
    if (!product || !quantity) return;
    setItems((prev) => [...prev, { productId: product.id, quantity: Number(quantity), unitPrice: product.sellPrice }]);
    setProductId("");
    setQuantity("1");
    setItemsError(null);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function goToStep(index: number) {
    if (index > maxVisitedStep || busy !== "idle") return;
    setStep(index);
  }

  function handleNext() {
    if (step === 0 && !validateDetails()) return;
    if (step === 1 && !validateItems()) return;
    const next = step + 1;
    setStep(next);
    setMaxVisitedStep((m) => Math.max(m, next));
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSaveDraft() {
    if (!validateDetails() || !validateItems()) return;
    setSubmitError(null);
    setBusy("draft");
    try {
      await createOrder({ variables: { input: { customerId, items } } });
      toast.success("Order saved as draft");
      holdSuccessThen(() => exitTo(ORDERS_LIST_ROUTE));
    } catch (err) {
      setBusy("idle");
      const message = err instanceof Error ? err.message : "Failed to save order";
      setSubmitError(message);
      toast.error(message);
    }
  }

  async function handleConfirmNow() {
    if (!validateDetails() || !validateItems() || !warehouseId) return;
    setSubmitError(null);
    setBusy("confirm");
    try {
      const res = await createOrder({ variables: { input: { customerId, items } } });
      const id = res.data?.createSalesOrder?.id;
      if (id) await confirmOrder({ variables: { id, warehouseId } });
      toast.success("Order created and confirmed — stock deducted");
      holdSuccessThen(() => exitTo(ORDERS_LIST_ROUTE));
    } catch (err) {
      setBusy("idle");
      const message = err instanceof Error ? err.message : "Failed to confirm order";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Sales", to: ORDERS_LIST_ROUTE }, { label: "Orders", to: ORDERS_LIST_ROUTE }, { label: "New Order" }]}
          title="Create Sales Order"
          subtitle="Build an order for a customer"
          backLabel="Back to Sales"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <OrderStepIndicator currentStep={step} maxVisitedStep={maxVisitedStep} onStepClick={goToStep} />
        <FormErrorBanner message={submitError} />

        {step === 0 && (
          <FormSection title="Order Details" description="Customer and fulfillment warehouse" icon={<ShoppingCart className="h-5 w-5" />} index={0}>
            <FormSubsection title="Details" description="Warehouse is only needed if you confirm immediately">
              <div className="space-y-1.5">
                <Label>
                  Customer
                  <RequiredMark />
                </Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={customerError} />
              </div>
              <div className="space-y-1.5">
                <Label>Fulfillment warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSubsection>
          </FormSection>
        )}

        {step === 1 && (
          <FormSection title="Items" description="Products and quantities for this order" icon={<ShoppingCart className="h-5 w-5" />} index={0}>
            <FormSubsection title="Line Items" description="Add each product line to the order" className="sm:grid-cols-1">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  <Label>Product</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className={FOCUS_GLOW}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (${p.sellPrice.toFixed(2)}, {p.totalStock} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label>Qty</Label>
                  <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={FOCUS_GLOW} />
                </div>
                <Button type="button" variant="outline" onClick={addItem} disabled={!productId} className={BUTTON_PRESS}>
                  Add
                </Button>
              </div>
              <FieldError message={itemsError} />
              {items.length > 0 && (
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((it, idx) => {
                      const p = products.find((pr) => pr.id === it.productId);
                      return (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="py-1.5">{p?.name}</td>
                          <td className="py-1.5 text-right">
                            {it.quantity} × ${it.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right">${(it.quantity * it.unitPrice).toFixed(2)}</td>
                          <td className="py-1.5 text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </FormSubsection>
          </FormSection>
        )}

        {step === 2 && (
          <FormSection title="Review" description="Confirm the order before saving" icon={<ShoppingCart className="h-5 w-5" />} index={0}>
            <FormSubsection title="Customer" className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border px-3 py-2">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Customer</p>
                <p className="mt-1 min-h-5 truncate text-sm font-medium text-foreground">{selectedCustomer?.name || "-"}</p>
              </div>
              <div className="rounded-md border border-border px-3 py-2">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Warehouse</p>
                <p className="mt-1 min-h-5 truncate text-sm font-medium text-foreground">
                  {warehouses.find((w) => w.id === warehouseId)?.name || "Not selected"}
                </p>
              </div>
            </FormSubsection>
            <FormSubsection title="Items" className="sm:grid-cols-1">
              <table className="w-full text-sm">
                <tbody>
                  {items.map((it, idx) => {
                    const p = products.find((pr) => pr.id === it.productId);
                    return (
                      <tr key={idx} className="border-b border-border last:border-0">
                        <td className="py-1.5">{p?.name}</td>
                        <td className="py-1.5 text-right">{it.quantity}</td>
                        <td className="py-1.5 text-right">${(it.quantity * it.unitPrice).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex justify-end text-sm font-medium">Total: ${total.toFixed(2)}</div>
              {!warehouseId && <p className="text-xs text-muted-foreground">Pick a warehouse in step 1 to confirm immediately.</p>}
            </FormSubsection>
          </FormSection>
        )}
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={busy !== "idle" || leaving} size="xs" />
        {step > 0 && (
          <Button type="button" variant="outline" size="xs" onClick={handleBack} disabled={busy !== "idle" || leaving} className={BUTTON_PRESS}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" variant="outline" size="xs" onClick={handleNext} disabled={busy !== "idle" || leaving} className={BUTTON_PRESS}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="xs" onClick={handleSaveDraft} disabled={busy !== "idle" || leaving} className={BUTTON_PRESS}>
              {busy === "draft" ? "Saving…" : "Save as Draft"}
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={handleConfirmNow}
              disabled={busy !== "idle" || leaving || !warehouseId}
              className={BUTTON_PRESS}
            >
              {busy === "confirm" ? "Confirming…" : "Confirm & Deduct Stock"}
            </Button>
          </>
        )}
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
