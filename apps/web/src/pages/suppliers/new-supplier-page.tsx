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
  BankDetailsSection,
  SettingsSection,
  DocumentsPlaceholder,
  emptySupplierForm,
  type SupplierFormState,
} from "./supplier-form-sections";

const SUPPLIERS_LIST_ROUTE = "/suppliers";

const CREATE_SUPPLIER = gql`
  mutation CreateSupplier($input: CreateSupplierInput!) {
    createSupplier(input: $input) {
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

export default function NewSupplierPage() {
  const [createSupplier] = useMutation(CREATE_SUPPLIER, { refetchQueries: ["Suppliers"] });

  const [form, setForm] = useState<SupplierFormState>(emptySupplierForm);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("basic");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(emptySupplierForm());
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    SUPPLIERS_LIST_ROUTE,
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
      await createSupplier({
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
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo(SUPPLIERS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to create supplier";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Suppliers", to: SUPPLIERS_LIST_ROUTE }, { label: "New Supplier" }]}
          title="Create Supplier"
          subtitle="Update the supplier details including contact information and settings"
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
              <BasicInfoSection form={form} setForm={setForm} nameError={nameError} />
            </TabsContent>
            <TabsContent value="addresses">
              <AddressesSection form={form} setForm={setForm} />
            </TabsContent>
            <TabsContent value="contacts">
              <ContactsSection form={form} setForm={setForm} />
            </TabsContent>
            <TabsContent value="bank">
              <BankDetailsSection form={form} setForm={setForm} />
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
          formId="supplier-form"
          status={status}
          idleLabel="Create Supplier"
          loadingLabel="Creating…"
          successLabel="Supplier created"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
