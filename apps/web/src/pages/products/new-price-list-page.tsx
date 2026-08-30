import { useState, type FormEvent } from "react";
import { gql, useMutation } from "@apollo/client";
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
import { FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const CREATE_PRICE_LIST_MUTATION = gql`
  mutation CreatePriceList($input: CreatePriceListInput!) {
    createPriceList(input: $input) {
      id
    }
  }
`;

const CURRENCIES = ["USD", "EUR", "GBP", "INR"];

const EMPTY_FORM = {
  name: "",
  description: "",
  currency: "USD",
  startDate: "",
  endDate: "",
  isDefault: false,
};

export default function NewPriceListPage() {
  const [createPriceList] = useMutation(CREATE_PRICE_LIST_MUTATION, {
    refetchQueries: ["PriceLists"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    "/products/pricelist",
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSubmitError(null);
    setStatus("submitting");
    try {
      await createPriceList({
        variables: {
          input: {
            name: form.name,
            description: form.description || undefined,
            currency: form.currency || undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            isDefault: form.isDefault,
          },
        },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo("/products/pricelist"));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create price list";
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
            { label: "Price List", to: "/products/pricelist" },
            { label: "New Price List" },
          ]}
          title="Create Price List"
          subtitle="Create a new price list for a customer segment or region"
          backLabel="Back to Price Lists"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form
          id="price-list-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <FormSection
            title="Price List Information"
            description="Enter the core details for this price list"
            index={0}
          >
            <FormSubsection
              title="Basic Information"
              description="Name, description and currency"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pl-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="pl-name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pl-desc">Description</Label>
                <Textarea
                  id="pl-desc"
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
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
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
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Validity"
            description="Set when this price list is active"
            index={1}
          >
            <FormSubsection
              title="Schedule & Default"
              description="Optional date range and default flag"
            >
              <div className="space-y-1.5">
                <Label htmlFor="pl-start">Start date</Label>
                <Input
                  id="pl-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-end">End date</Label>
                <Input
                  id="pl-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="pl-default">Default price list</Label>
                  <p className="text-xs text-muted-foreground">
                    Used when no other price list applies.
                  </p>
                </div>
                <Switch
                  id="pl-default"
                  checked={form.isDefault}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isDefault: v }))
                  }
                />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} />
        <FormSubmitButton
          formId="price-list-form"
          status={status}
          idleLabel="Create Price List"
          loadingLabel="Creating price list…"
          successLabel="Price list created"
          disabled={leaving}
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
