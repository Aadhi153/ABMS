import { useState, type FormEvent } from "react";
import { gql, useMutation } from "@apollo/client";
import { Warehouse as WarehouseIcon } from "lucide-react";
import { Input, Label, toast } from "@abms/ui";
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

const WAREHOUSES_LIST_ROUTE = "/settings/warehouses";

const CREATE_WAREHOUSE_MUTATION = gql`
  mutation CreateWarehouse($input: CreateWarehouseInput!) {
    createWarehouse(input: $input) {
      id
    }
  }
`;

const EMPTY_FORM = { name: "", address: "" };

export default function NewWarehousePage() {
  const [createWarehouse] = useMutation(CREATE_WAREHOUSE_MUTATION, { refetchQueries: ["Warehouses"] });

  const [form, setForm] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    WAREHOUSES_LIST_ROUTE,
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nameInvalid = !form.name.trim();
    setNameError(nameInvalid ? "Name is required" : null);
    if (nameInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await createWarehouse({ variables: { input: form } });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo(WAREHOUSES_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create warehouse";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Settings", to: "/settings" }, { label: "Warehouses", to: WAREHOUSES_LIST_ROUTE }, { label: "New Warehouse" }]}
          title="Create Warehouse"
          subtitle="Add a physical or virtual stock location"
          backLabel="Back to Warehouses"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="warehouse-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Warehouse"
            description="Used across Inventory, Sales, and Purchase to track stock location"
            icon={<WarehouseIcon className="h-5 w-5" />}
            index={0}
          >
            <FormSubsection title="Details" description="Name and address">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wh-name">
                  Name
                  <RequiredMark />
                </Label>
                <Input
                  id="wh-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={nameError} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wh-address">Address</Label>
                <Input
                  id="wh-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="warehouse-form"
          status={status}
          idleLabel="Create Warehouse"
          loadingLabel="Creating…"
          successLabel="Warehouse created"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
