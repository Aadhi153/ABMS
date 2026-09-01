import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
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
  customerToFormState,
  type CustomerFormState,
  type CustomerRecord,
} from "./customer-form-sections";

const CUSTOMERS_LIST_ROUTE = "/customers";

const CUSTOMER_QUERY = gql`
  query CustomerForEdit($id: String!) {
    customer(id: $id) {
      id
      code
      name
      type
      contactPerson
      email
      phoneCountryCode
      phone
      website
      taxId
      notes
      billingPostalCode
      billingAddressLine1
      billingAddressLine2
      billingCity
      billingState
      billingCountry
      shippingPostalCode
      shippingAddressLine1
      shippingAddressLine2
      shippingCity
      shippingState
      shippingCountry
      creditLimit
      paymentTerms
      active
      isAlsoSupplier
      contacts {
        type
        value
        isPrimary
      }
    }
  }
`;

const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: String!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
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

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{ customer: (CustomerRecord & { id: string; code: string }) | null }>(CUSTOMER_QUERY, {
    variables: { id },
    skip: !id,
  });
  const [updateCustomer] = useMutation(UPDATE_CUSTOMER, { refetchQueries: ["Customers"] });

  const [form, setForm] = useState<CustomerFormState | null>(null);
  const [initialForm, setInitialForm] = useState<CustomerFormState | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("basic");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.customer && !form) {
      const hydrated = customerToFormState(data.customer);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    CUSTOMERS_LIST_ROUTE,
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    const nameInvalid = !form.name.trim();
    setNameError(nameInvalid ? "Name is required" : null);
    if (nameInvalid) {
      setTab("basic");
      return;
    }

    setSubmitError(null);
    setStatus("submitting");
    try {
      await updateCustomer({
        variables: {
          id,
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
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(CUSTOMERS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update customer";
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

  if (!loading && !data?.customer) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Customers", to: CUSTOMERS_LIST_ROUTE }, { label: "Not found" }]}
            title="Customer not found"
            backLabel="Back to Customers"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form) return null;

  function updateForm(updater: (f: CustomerFormState) => CustomerFormState) {
    setForm((prev) => (prev ? updater(prev) : prev));
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Customers", to: CUSTOMERS_LIST_ROUTE }, { label: `Edit ${form.name}` }]}
          title="Edit Customer"
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
              <BasicInfoSection form={form} setForm={updateForm} nameError={nameError} />
            </TabsContent>
            <TabsContent value="addresses">
              <AddressesSection form={form} setForm={updateForm} />
            </TabsContent>
            <TabsContent value="contacts">
              <ContactsSection form={form} setForm={updateForm} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsSection form={form} setForm={updateForm} />
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
          idleLabel="Update Customer"
          loadingLabel="Saving…"
          successLabel="Customer updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
