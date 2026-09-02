import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ClipboardList, Trash2 } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@abms/ui";
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
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";

const ORDERS_LIST_ROUTE = "/purchase/orders";

const OPTIONS_QUERY = gql`
  query NewPurchaseOrderOptions {
    suppliers {
      id
      name
      active
    }
    products {
      id
      sku
      name
      costPrice
      active
    }
  }
`;

const CREATE_PO = gql`
  mutation CreatePurchaseOrder($input: CreatePurchaseOrderInput!) {
    createPurchaseOrder(input: $input) {
      id
    }
  }
`;

type Item = { productId: string; quantity: number; unitCost: number };

const EMPTY_FORM = { supplierId: "", expectedDeliveryDate: "" };

export default function NewPurchaseOrderPage() {
  const { data } = useQuery<{
    suppliers: Array<{ id: string; name: string; active: boolean }>;
    products: Array<{ id: string; sku: string; name: string; costPrice: number; active: boolean }>;
  }>(OPTIONS_QUERY);
  const [createPo] = useMutation(CREATE_PO, { refetchQueries: ["PurchasePageData"] });

  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState<Item[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const products = data?.products ?? [];
  const suppliers = (data?.suppliers ?? []).filter((s) => s.active !== false);

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM) || items.length > 0;
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    ORDERS_LIST_ROUTE,
    dirty,
  );

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  function addItem() {
    const product = products.find((p) => p.id === productId);
    if (!product || !quantity) return;
    setItems((prev) => [...prev, { productId: product.id, quantity: Number(quantity), unitCost: product.costPrice }]);
    setProductId("");
    setQuantity("1");
    setItemsError(null);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const supplierInvalid = !form.supplierId;
    const itemsInvalid = items.length === 0;
    setSupplierError(supplierInvalid ? "Select a supplier" : null);
    setItemsError(itemsInvalid ? "Add at least one line item" : null);
    if (supplierInvalid || itemsInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await createPo({
        variables: {
          input: {
            supplierId: form.supplierId,
            expectedDeliveryDate: form.expectedDeliveryDate || undefined,
            items,
          },
        },
      });
      toast.success("Purchase order created");
      setStatus("success");
      holdSuccessThen(() => exitTo(ORDERS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create purchase order";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Purchase", to: ORDERS_LIST_ROUTE }, { label: "Orders", to: ORDERS_LIST_ROUTE }, { label: "New Purchase Order" }]}
          title="Create Purchase Order"
          subtitle="Order stock from a supplier"
          backLabel="Back to Purchase"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="po-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Purchase Order"
            description="Supplier, expected delivery, and line items"
            icon={<ClipboardList className="h-5 w-5" />}
            index={0}
          >
            <FormSubsection title="Order Details" description="Who this order is for and when it's expected">
              <div className="space-y-1.5">
                <Label>
                  Supplier
                  <RequiredMark />
                </Label>
                <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={supplierError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-delivery">Expected delivery</Label>
                <Input
                  id="po-delivery"
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>

            <FormSubsection title="Line Items" description="Products and quantities to order" className="sm:grid-cols-1">
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
                          {p.name} (${p.costPrice.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1.5">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={FOCUS_GLOW}
                  />
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
                            {it.quantity} × ${it.unitCost.toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right">${(it.quantity * it.unitCost).toFixed(2)}</td>
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
              {items.length > 0 && (
                <div className="flex justify-end text-sm font-medium">Subtotal: ${subtotal.toFixed(2)}</div>
              )}
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="po-form"
          status={status}
          idleLabel="Create Purchase Order"
          loadingLabel="Creating…"
          successLabel="Order created"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
