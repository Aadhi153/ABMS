import { useState, type FormEvent } from "react";
import { gql, useMutation } from "@apollo/client";
import { Tabs, TabsContent, TabsList, TabsTrigger, toast } from "@abms/ui";
import {
  FormPage,
  FormScrollArea,
  FormPageHeader,
  FormFooter,
  FormErrorBanner,
  FormCancelButton,
  FormSubmitButton,
  useDiscardGuard,
  type SubmitStatus,
} from "../products/form-page";
import { holdSuccessThen } from "../products/form-motion";
import {
  BasicInfoSection,
  AddressesSection,
  ContactsSection,
  SettingsSection,
  DocumentsPlaceholder,
  emptyCustomerForm,
  type CustomerFormState,
} from "./customer-form-sections";

const CUSTOMERS_LIST_ROUTE = "/customers";

const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
    }
  }
`;

const TABS = [
  { key: "basic", label: "Basic Info" },
  { key: "addresses", label: "Addresses" },
  { key: "contacts", label: "Contacts" },
  { key: "settings", label: "Settings" },
] as const;

export default function NewCustomerPage() {
  const [createCustomer] = useMutation(CREATE_CUSTOMER, { refetchQueries: ["Customers"] });

  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("basic");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(emptyCustomerForm());
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    CUSTOMERS_LIST_ROUTE,
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nameInvalid = !form.name.trim();
    setNameError(nameInvalid ? "Name is required" : null);
    if (nameInvalid) {
      setTab("basic");
      return;
    }

    setSubmitError(null);
    setStatus("submitting");
    try {
      await createCustomer({
        variables: {
          input: {
            name: form.name,
            type: form.type,
            contactPerson: form.contactPerson || undefined,
            email: form.email || undefined,
            phoneCountryCode: form.phoneCountryCode || undefined,
            phone: form.phone || undefined,
            website: form.website || undefined,
            taxId: form.taxId || undefined,
            notes: form.notes || undefined,
            billingPostalCode: form.billingPostalCode || undefined,
            billingAddressLine1: form.billingAddressLine1 || undefined,
            billingAddressLine2: form.billingAddressLine2 || undefined,
            billingCity: form.billingCity || undefined,
            billingState: form.billingState || undefined,
            billingCountry: form.billingCountry || undefined,
            shippingPostalCode: form.shippingPostalCode || undefined,
            shippingAddressLine1: form.shippingAddressLine1 || undefined,
            shippingAddressLine2: form.shippingAddressLine2 || undefined,
            shippingCity: form.shippingCity || undefined,
            shippingState: form.shippingState || undefined,
            shippingCountry: form.shippingCountry || undefined,
            creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
            paymentTerms: form.paymentTerms || undefined,
            active: form.active,
            isAlsoSupplier: form.isAlsoSupplier,
            contacts: form.contacts.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary })),
          },
        },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo(CUSTOMERS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create customer";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Customers", to: CUSTOMERS_LIST_ROUTE }, { label: "New Customer" }]}
          title="Create Customer"
          subtitle="Update the customer details including contact information and settings"
          backLabel="Back to Customers"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="customer-form" onSubmit={handleSubmit} noValidate>
          <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof TABS)[number]["key"])}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="basic">
              <BasicInfoSection form={form} setForm={setForm} nameError={nameError} />
            </TabsContent>
            <TabsContent value="addresses">
              <AddressesSection form={form} setForm={setForm} />
            </TabsContent>
            <TabsContent value="contacts">
              <ContactsSection form={form} setForm={setForm} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsSection form={form} setForm={setForm} />
            </TabsContent>
          </Tabs>
          <DocumentsPlaceholder />
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="customer-form"
          status={status}
          idleLabel="Create Customer"
          loadingLabel="Creating…"
          successLabel="Customer created"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
