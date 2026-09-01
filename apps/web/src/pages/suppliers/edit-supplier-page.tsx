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
  BankDetailsSection,
  SettingsSection,
  DocumentsPlaceholder,
  supplierToFormState,
  type SupplierFormState,
  type SupplierRecord,
} from "./supplier-form-sections";

const SUPPLIERS_LIST_ROUTE = "/suppliers";

const SUPPLIER_QUERY = gql`
  query SupplierForEdit($id: String!) {
    supplier(id: $id) {
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
      leadTime
      minOrderValue
      notes
      creditLimit
      paymentTerms
      active
      isAlsoCustomer
      contacts {
        type
        value
        isPrimary
      }
      addresses {
        type
        addressLine1
        addressLine2
        city
        state
        postalCode
        country
      }
      bankAccounts {
        bankName
        bankBranch
        accountNumber
        ifscCode
        accountType
      }
    }
  }
`;

const UPDATE_SUPPLIER = gql`
  mutation UpdateSupplier($id: String!, $input: UpdateSupplierInput!) {
    updateSupplier(id: $id, input: $input) {
      id
    }
  }
`;

const TABS = [
  { key: "basic", label: "Basic Info" },
  { key: "addresses", label: "Addresses" },
  { key: "contacts", label: "Contacts" },
  { key: "bank", label: "Bank Details" },
  { key: "settings", label: "Settings" },
] as const;

export default function EditSupplierPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{ supplier: (SupplierRecord & { id: string; code: string }) | null }>(SUPPLIER_QUERY, {
    variables: { id },
    skip: !id,
  });
  const [updateSupplier] = useMutation(UPDATE_SUPPLIER, { refetchQueries: ["Suppliers"] });

  const [form, setForm] = useState<SupplierFormState | null>(null);
  const [initialForm, setInitialForm] = useState<SupplierFormState | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("basic");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.supplier && !form) {
      const hydrated = supplierToFormState(data.supplier);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    SUPPLIERS_LIST_ROUTE,
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
      await updateSupplier({
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
            leadTime: form.leadTime ? Number(form.leadTime) : undefined,
            minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
            notes: form.notes || undefined,
            creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
            paymentTerms: form.paymentTerms || undefined,
            active: form.active,
            isAlsoCustomer: form.isAlsoCustomer,
            contacts: form.contacts.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary })),
            addresses: form.addresses.map((a) => ({
              type: a.type,
              addressLine1: a.addressLine1,
              addressLine2: a.addressLine2 || undefined,
              city: a.city,
              state: a.state,
              postalCode: a.postalCode,
              country: a.country,
            })),
            bankAccounts: form.bankAccounts.map((b) => ({
              bankName: b.bankName,
              bankBranch: b.bankBranch,
              accountNumber: b.accountNumber,
              ifscCode: b.ifscCode,
              accountType: b.accountType,
            })),
          },
        },
      });
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(SUPPLIERS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update supplier";
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

  if (!loading && !data?.supplier) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Suppliers", to: SUPPLIERS_LIST_ROUTE }, { label: "Not found" }]}
            title="Supplier not found"
            backLabel="Back to Suppliers"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form) return null;

  function updateForm(updater: (f: SupplierFormState) => SupplierFormState) {
    setForm((prev) => (prev ? updater(prev) : prev));
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Suppliers", to: SUPPLIERS_LIST_ROUTE }, { label: `Edit ${form.name}` }]}
          title="Edit Supplier"
          subtitle="Update supplier information"
          backLabel="Back to Suppliers"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="supplier-form" onSubmit={handleSubmit} noValidate>
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
            <TabsContent value="bank">
              <BankDetailsSection form={form} setForm={updateForm} />
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
          formId="supplier-form"
          status={status}
          idleLabel="Update Supplier"
          loadingLabel="Saving…"
          successLabel="Supplier updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
