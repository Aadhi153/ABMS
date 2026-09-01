import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { ArrowLeftRight } from "lucide-react";
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

const TRANSFERS_LIST_ROUTE = "/inventory/transfers";

const OPTIONS_QUERY = gql`
  query InventoryTransferOptions {
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

const TRANSFER_STOCK_MUTATION = gql`
  mutation TransferStock($input: TransferStockInput!) {
    transferStock(input: $input) {
      id
    }
  }
`;

const EMPTY_FORM = { productId: "", fromWarehouseId: "", toWarehouseId: "", quantity: "", reason: "" };

export default function NewTransferPage() {
  const { data } = useQuery<{
    products: Array<{ id: string; sku: string; name: string }>;
    warehouses: Array<{ id: string; name: string; active: boolean }>;
  }>(OPTIONS_QUERY);
  const [transferStock] = useMutation(TRANSFER_STOCK_MUTATION, { refetchQueries: ["InventoryProducts", "StockTransfers"] });

  const [form, setForm] = useState(EMPTY_FORM);
  const [productError, setProductError] = useState<string | null>(null);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    TRANSFERS_LIST_ROUTE,
    dirty,
  );

  const sameWarehouse = !!form.fromWarehouseId && form.fromWarehouseId === form.toWarehouseId;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const productInvalid = !form.productId;
    const warehouseInvalid = !form.fromWarehouseId || !form.toWarehouseId || sameWarehouse;
    const quantityInvalid = form.quantity === "" || Number(form.quantity) <= 0;
    const reasonInvalid = !form.reason.trim();
    setProductError(productInvalid ? "Select a product" : null);
    setWarehouseError(
      warehouseInvalid
        ? sameWarehouse
          ? "Source and destination must be different"
          : "Select both warehouses"
        : null,
    );
    setQuantityError(quantityInvalid ? "Quantity must be greater than 0" : null);
    setReasonError(reasonInvalid ? "Reason is required" : null);
    if (productInvalid || warehouseInvalid || quantityInvalid || reasonInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await transferStock({
        variables: {
          input: {
            productId: form.productId,
            fromWarehouseId: form.fromWarehouseId,
            toWarehouseId: form.toWarehouseId,
            quantity: Number(form.quantity),
            reason: form.reason,
          },
        },
      });
      toast.success("Stock transferred");
      setStatus("success");
      holdSuccessThen(() => exitTo(TRANSFERS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to transfer stock";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Inventory", to: "/inventory" }, { label: "Transfers", to: TRANSFERS_LIST_ROUTE }, { label: "New Transfer" }]}
          title="New Stock Transfer"
          subtitle="Move stock for a product between two warehouses"
          backLabel="Back to Transfers"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="transfer-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Transfer"
            description="Product, source, destination, and quantity"
            icon={<ArrowLeftRight className="h-5 w-5" />}
            index={0}
          >
            <FormSubsection title="Details" description="Source and destination must be different warehouses">
              <div className="space-y-1.5 sm:col-span-2">
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
                  From warehouse
                  <RequiredMark />
                </Label>
                <Select value={form.fromWarehouseId} onValueChange={(v) => setForm((f) => ({ ...f, fromWarehouseId: v }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Source" />
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
                <Label>
                  To warehouse
                  <RequiredMark />
                </Label>
                <Select value={form.toWarehouseId} onValueChange={(v) => setForm((f) => ({ ...f, toWarehouseId: v }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="Destination" />
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
              <div className="sm:col-span-2">
                <FieldError message={warehouseError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-qty">
                  Quantity
                  <RequiredMark />
                </Label>
                <Input
                  id="tr-qty"
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={quantityError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-reason">
                  Reason
                  <RequiredMark />
                </Label>
                <Input
                  id="tr-reason"
                  required
                  placeholder="e.g. Rebalancing stock, fulfilling regional demand"
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
          formId="transfer-form"
          status={status}
          idleLabel="Transfer Stock"
          loadingLabel="Transferring…"
          successLabel="Stock transferred"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
