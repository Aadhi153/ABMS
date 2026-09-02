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
  FormStat,
  RequiredMark,
  useDiscardGuard,
  type SubmitStatus,
} from "./form-page";
import { FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const PRICE_LISTS_LIST_ROUTE = "/products/pricelist";
const CURRENCIES = ["USD", "EUR", "GBP", "INR"];

const EDIT_PRICE_LIST_QUERY = gql`
  query EditPriceListData($id: String!) {
    priceList(id: $id) {
      id
      name
      code
      description
      currency
      zone
      priceSyncEnabled
      productsAutoSyncEnabled
      startDate
      endDate
      isDefault
      active
      items {
        id
      }
      updatedAt
    }
  }
`;

const UPDATE_PRICE_LIST_MUTATION = gql`
  mutation UpdatePriceListFull($id: String!, $input: UpdatePriceListInput!) {
    updatePriceList(id: $id, input: $input) {
      id
    }
  }
`;

interface FormState {
  name: string;
  code: string;
  description: string;
  currency: string;
  zone: string;
  priceSyncEnabled: boolean;
  productsAutoSyncEnabled: boolean;
  startDate: string;
  endDate: string;
  isDefault: boolean;
  active: boolean;
}

interface PriceListRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  currency: string;
  zone: string | null;
  priceSyncEnabled: boolean;
  productsAutoSyncEnabled: boolean;
  startDate: string | null;
  endDate: string | null;
  isDefault: boolean;
  active: boolean;
  items: Array<{ id: string }>;
  updatedAt: string;
}

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function priceListToFormState(l: PriceListRecord): FormState {
  return {
    name: l.name,
    code: l.code ?? "",
    description: l.description ?? "",
    currency: l.currency,
    zone: l.zone ?? "",
    priceSyncEnabled: l.priceSyncEnabled,
    productsAutoSyncEnabled: l.productsAutoSyncEnabled,
    startDate: toDateInput(l.startDate),
    endDate: toDateInput(l.endDate),
    isDefault: l.isDefault,
    active: l.active,
  };
}

export default function EditPriceListPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{ priceList: PriceListRecord | null }>(EDIT_PRICE_LIST_QUERY, {
    variables: { id },
    skip: !id,
  });
  const [updatePriceList] = useMutation(UPDATE_PRICE_LIST_MUTATION, { refetchQueries: ["PriceLists"] });

  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.priceList && !form) {
      const hydrated = priceListToFormState(data.priceList);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(PRICE_LISTS_LIST_ROUTE, dirty);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSubmitError(null);
    setStatus("submitting");
    try {
      await updatePriceList({
        variables: {
          id,
          input: {
            name: form.name,
            code: form.code || undefined,
            description: form.description || undefined,
            currency: form.currency || undefined,
            zone: form.zone || undefined,
            priceSyncEnabled: form.priceSyncEnabled,
            productsAutoSyncEnabled: form.productsAutoSyncEnabled,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            isDefault: form.isDefault,
            active: form.active,
          },
        },
      });
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(PRICE_LISTS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update price list";
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

  if (!loading && !data?.priceList) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Price List", to: PRICE_LISTS_LIST_ROUTE }, { label: "Not found" }]}
            title="Price list not found"
            backLabel="Back to Price Lists"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form || !data?.priceList) return null;

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[
            { label: "Products", to: "/products/all" },
            { label: "Price List", to: PRICE_LISTS_LIST_ROUTE },
            { label: `Edit ${form.name}` },
          ]}
          title="Edit Price List"
          subtitle="Update this price list's details"
          backLabel="Back to Price Lists"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <FormSection title="Overview" description="Read-only summary for this price list" index={0}>
          <FormSubsection title="Stats" className="sm:grid-cols-2">
            <FormStat label="Items" value={data.priceList.items.length} />
            <FormStat label="Updated" value={new Date(data.priceList.updatedAt).toLocaleString()} />
          </FormSubsection>
        </FormSection>
        <form id="price-list-form" onSubmit={handleSubmit} className="space-y-6">
          <FormSection
            title="Price List Information"
            description="Update the core details for this price list"
            index={1}
          >
            <FormSubsection title="Basic Information" description="Name, code, description and currency">
              <div className="space-y-1.5">
                <Label htmlFor="pl-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="pl-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-code">Price list code</Label>
                <Input
                  id="pl-code"
                  placeholder="e.g. WHOLESALE-01"
                  value={form.code}
                  onChange={(e) => setForm((f) => (f ? { ...f, code: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pl-desc">Description</Label>
                <Textarea
                  id="pl-desc"
                  placeholder="Optional short description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => (f ? { ...f, currency: v } : f))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-zone">Zone</Label>
                <Input
                  id="pl-zone"
                  placeholder="e.g. North America"
                  value={form.zone}
                  onChange={(e) => setForm((f) => (f ? { ...f, zone: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection title="Validity" description="Set when this price list is active" index={2}>
            <FormSubsection title="Schedule & Default" description="Optional date range and default flag">
              <div className="space-y-1.5">
                <Label htmlFor="pl-start">Start date</Label>
                <Input
                  id="pl-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => (f ? { ...f, startDate: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-end">End date</Label>
                <Input
                  id="pl-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => (f ? { ...f, endDate: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="pl-price-sync">Price sync enabled</Label>
                  <p className="text-xs text-muted-foreground">Auto-update prices when linked source prices change.</p>
                </div>
                <Switch
                  id="pl-price-sync"
                  checked={form.priceSyncEnabled}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, priceSyncEnabled: v } : f))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="pl-products-sync">Products auto sync enabled</Label>
                  <p className="text-xs text-muted-foreground">Automatically include new products in this price list.</p>
                </div>
                <Switch
                  id="pl-products-sync"
                  checked={form.productsAutoSyncEnabled}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, productsAutoSyncEnabled: v } : f))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="pl-default">Default price list</Label>
                  <p className="text-xs text-muted-foreground">Used when no other price list applies.</p>
                </div>
                <Switch
                  id="pl-default"
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm((f) => (f ? { ...f, isDefault: v } : f))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="pl-active">Status</Label>
                  <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
                </div>
                <Switch
                  id="pl-active"
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
          formId="price-list-form"
          status={status}
          idleLabel="Save changes"
          loadingLabel="Saving…"
          successLabel="Price list updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
