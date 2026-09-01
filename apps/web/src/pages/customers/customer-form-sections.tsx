import { Copy, FileText, MapPin, Phone, Plus, Settings as SettingsIcon, Trash2, User } from "lucide-react";
import { BusinessType, ContactMethodType } from "@abms/shared";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "@abms/ui";
import { FormSection, FormSubsection, RequiredMark, FieldError } from "../products/form-page";
import { FOCUS_GLOW, BUTTON_PRESS } from "../products/form-motion";
import { COUNTRIES } from "../../lib/geo";
import { BUSINESS_TYPE_OPTIONS, CONTACT_METHOD_OPTIONS, PAYMENT_TERMS_OPTIONS, PHONE_COUNTRY_CODES } from "../../lib/party-options";

export interface CustomerContactRow {
  type: ContactMethodType;
  value: string;
  isPrimary: boolean;
}

export interface CustomerFormState {
  name: string;
  type: BusinessType;
  contactPerson: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  website: string;
  taxId: string;
  notes: string;
  billingPostalCode: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  shippingPostalCode: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  creditLimit: string;
  paymentTerms: string;
  active: boolean;
  isAlsoSupplier: boolean;
  contacts: CustomerContactRow[];
}

export function emptyCustomerForm(): CustomerFormState {
  return {
    name: "",
    type: BusinessType.BUSINESS,
    contactPerson: "",
    email: "",
    phoneCountryCode: "+91",
    phone: "",
    website: "",
    taxId: "",
    notes: "",
    billingPostalCode: "",
    billingAddressLine1: "",
    billingAddressLine2: "",
    billingCity: "",
    billingState: "",
    billingCountry: "",
    shippingPostalCode: "",
    shippingAddressLine1: "",
    shippingAddressLine2: "",
    shippingCity: "",
    shippingState: "",
    shippingCountry: "",
    creditLimit: "",
    paymentTerms: "",
    active: true,
    isAlsoSupplier: false,
    contacts: [],
  };
}

export interface CustomerRecord {
  name: string;
  type: BusinessType;
  contactPerson?: string | null;
  email?: string | null;
  phoneCountryCode?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  notes?: string | null;
  billingPostalCode?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingCountry?: string | null;
  shippingPostalCode?: string | null;
  shippingAddressLine1?: string | null;
  shippingAddressLine2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingCountry?: string | null;
  creditLimit?: number | null;
  paymentTerms?: string | null;
  active: boolean;
  isAlsoSupplier: boolean;
  contacts: Array<{ type: ContactMethodType; value: string; isPrimary: boolean }>;
}

export function customerToFormState(c: CustomerRecord): CustomerFormState {
  return {
    name: c.name,
    type: c.type,
    contactPerson: c.contactPerson ?? "",
    email: c.email ?? "",
    phoneCountryCode: c.phoneCountryCode ?? "+91",
    phone: c.phone ?? "",
    website: c.website ?? "",
    taxId: c.taxId ?? "",
    notes: c.notes ?? "",
    billingPostalCode: c.billingPostalCode ?? "",
    billingAddressLine1: c.billingAddressLine1 ?? "",
    billingAddressLine2: c.billingAddressLine2 ?? "",
    billingCity: c.billingCity ?? "",
    billingState: c.billingState ?? "",
    billingCountry: c.billingCountry ?? "",
    shippingPostalCode: c.shippingPostalCode ?? "",
    shippingAddressLine1: c.shippingAddressLine1 ?? "",
    shippingAddressLine2: c.shippingAddressLine2 ?? "",
    shippingCity: c.shippingCity ?? "",
    shippingState: c.shippingState ?? "",
    shippingCountry: c.shippingCountry ?? "",
    creditLimit: c.creditLimit != null ? String(c.creditLimit) : "",
    paymentTerms: c.paymentTerms ?? "",
    active: c.active,
    isAlsoSupplier: c.isAlsoSupplier,
    contacts: c.contacts.map((ct) => ({ type: ct.type, value: ct.value, isPrimary: ct.isPrimary })),
  };
}

interface SectionProps {
  form: CustomerFormState;
  setForm: (updater: (f: CustomerFormState) => CustomerFormState) => void;
  nameError?: string | null;
}

export function BasicInfoSection({ form, setForm, nameError }: SectionProps) {
  return (
    <FormSection
      title="Customer Information"
      description="Enter basic information about the customer"
      icon={<User className="h-5 w-5" />}
      index={0}
    >
      <FormSubsection title="Identity" description="Name and business classification">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">
            Customer Name
            <RequiredMark />
          </Label>
          <Input
            id="c-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={FOCUS_GLOW}
          />
          <FieldError message={nameError} />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as BusinessType }))}>
            <SelectTrigger className={FOCUS_GLOW}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-contact-person">Contact Person</Label>
          <Input
            id="c-contact-person"
            value={form.contactPerson}
            onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
            className={FOCUS_GLOW}
          />
        </div>
      </FormSubsection>

      <FormSubsection title="Contact" description="Primary contact details">
        <div className="space-y-1.5">
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={FOCUS_GLOW}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-phone">Phone</Label>
          <div className="flex gap-2">
            <Select value={form.phoneCountryCode} onValueChange={(v) => setForm((f) => ({ ...f, phoneCountryCode: v }))}>
              <SelectTrigger className={cn("w-24", FOCUS_GLOW)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHONE_COUNTRY_CODES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="c-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={cn("flex-1", FOCUS_GLOW)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-website">Website</Label>
          <Input
            id="c-website"
            placeholder="https://example.com"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className={FOCUS_GLOW}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-tax-id">Tax ID</Label>
          <Input
            id="c-tax-id"
            value={form.taxId}
            onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
            className={FOCUS_GLOW}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-notes">Notes</Label>
          <Textarea
            id="c-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={FOCUS_GLOW}
          />
        </div>
      </FormSubsection>
    </FormSection>
  );
}

export function AddressesSection({ form, setForm }: SectionProps) {
  function copyFromBilling() {
    setForm((f) => ({
      ...f,
      shippingPostalCode: f.billingPostalCode,
      shippingAddressLine1: f.billingAddressLine1,
      shippingAddressLine2: f.billingAddressLine2,
      shippingCity: f.billingCity,
      shippingState: f.billingState,
      shippingCountry: f.billingCountry,
    }));
  }

  return (
    <FormSection title="Address" description="Billing and shipping addresses" icon={<MapPin className="h-5 w-5" />} index={0}>
      <FormSubsection title="Billing Address" className="sm:grid-cols-1">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-bill-postal">Postal Code</Label>
            <Input
              id="c-bill-postal"
              value={form.billingPostalCode}
              onChange={(e) => setForm((f) => ({ ...f, billingPostalCode: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-bill-line1">Address Line 1</Label>
            <Input
              id="c-bill-line1"
              value={form.billingAddressLine1}
              onChange={(e) => setForm((f) => ({ ...f, billingAddressLine1: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-bill-line2">Address Line 2</Label>
            <Input
              id="c-bill-line2"
              value={form.billingAddressLine2}
              onChange={(e) => setForm((f) => ({ ...f, billingAddressLine2: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-bill-city">City</Label>
            <Input
              id="c-bill-city"
              value={form.billingCity}
              onChange={(e) => setForm((f) => ({ ...f, billingCity: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-bill-state">State</Label>
            <Input
              id="c-bill-state"
              value={form.billingState}
              onChange={(e) => setForm((f) => ({ ...f, billingState: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select value={form.billingCountry} onValueChange={(v) => setForm((f) => ({ ...f, billingCountry: v }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSubsection>

      <FormSubsection title="Shipping Address" className="sm:grid-cols-1">
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="xs" onClick={copyFromBilling} className={BUTTON_PRESS}>
            <Copy className="h-3.5 w-3.5" />
            Copy from Billing
          </Button>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-ship-postal">Postal Code</Label>
            <Input
              id="c-ship-postal"
              value={form.shippingPostalCode}
              onChange={(e) => setForm((f) => ({ ...f, shippingPostalCode: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-ship-line1">Address Line 1</Label>
            <Input
              id="c-ship-line1"
              value={form.shippingAddressLine1}
              onChange={(e) => setForm((f) => ({ ...f, shippingAddressLine1: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-ship-line2">Address Line 2</Label>
            <Input
              id="c-ship-line2"
              value={form.shippingAddressLine2}
              onChange={(e) => setForm((f) => ({ ...f, shippingAddressLine2: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-ship-city">City</Label>
            <Input
              id="c-ship-city"
              value={form.shippingCity}
              onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-ship-state">State</Label>
            <Input
              id="c-ship-state"
              value={form.shippingState}
              onChange={(e) => setForm((f) => ({ ...f, shippingState: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select value={form.shippingCountry} onValueChange={(v) => setForm((f) => ({ ...f, shippingCountry: v }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSubsection>
    </FormSection>
  );
}

export function ContactsSection({ form, setForm }: SectionProps) {
  function addContact() {
    setForm((f) => ({ ...f, contacts: [...f.contacts, { type: ContactMethodType.PHONE, value: "", isPrimary: false }] }));
  }
  function removeContact(idx: number) {
    setForm((f) => ({ ...f, contacts: f.contacts.filter((_, i) => i !== idx) }));
  }
  function updateContact(idx: number, patch: Partial<CustomerContactRow>) {
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, i) => (i === idx ? { ...c, ...patch } : c)) }));
  }

  return (
    <FormSection title="Additional Contacts" description="Manage additional contact methods" icon={<Phone className="h-5 w-5" />} index={0}>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="xs" onClick={addContact} className={BUTTON_PRESS}>
          <Plus className="h-3.5 w-3.5" />
          Add Contact
        </Button>
      </div>
      {form.contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No additional contacts yet.</p>
      ) : (
        form.contacts.map((contact, idx) => (
          <FormSubsection key={idx} title={`Contact ${idx + 1}`} className="sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={contact.type} onValueChange={(v) => updateContact(idx, { type: v as ContactMethodType })}>
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input value={contact.value} onChange={(e) => updateContact(idx, { value: e.target.value })} className={FOCUS_GLOW} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox checked={contact.isPrimary} onCheckedChange={(v) => updateContact(idx, { isPrimary: v })} id={`c-contact-primary-${idx}`} />
              <Label htmlFor={`c-contact-primary-${idx}`} className="font-normal">
                Primary
              </Label>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(idx)} aria-label="Remove contact">
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </FormSubsection>
        ))
      )}
    </FormSection>
  );
}

export function SettingsSection({ form, setForm }: SectionProps) {
  return (
    <FormSection title="Business Settings" description="Configure payment terms and other business settings" icon={<SettingsIcon className="h-5 w-5" />} index={0}>
      <FormSubsection title="Terms" description="Standard payment terms and credit limit">
        <div className="space-y-1.5">
          <Label>Payment Terms</Label>
          <Select value={form.paymentTerms} onValueChange={(v) => setForm((f) => ({ ...f, paymentTerms: v }))}>
            <SelectTrigger className={FOCUS_GLOW}>
              <SelectValue placeholder="Select payment terms" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-credit-limit">Credit Limit</Label>
          <Input
            id="c-credit-limit"
            type="number"
            step="0.01"
            min="0"
            value={form.creditLimit}
            onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
            className={FOCUS_GLOW}
          />
        </div>
      </FormSubsection>
      <FormSubsection title="Status" className="sm:grid-cols-1">
        <div className="flex items-center gap-3">
          <Checkbox checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} id="c-active" />
          <div>
            <Label htmlFor="c-active" className="font-medium">Active Customer</Label>
            <p className="text-xs text-muted-foreground">Whether this customer is active and can place new orders</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox checked={form.isAlsoSupplier} onCheckedChange={(v) => setForm((f) => ({ ...f, isAlsoSupplier: v }))} id="c-also-supplier" />
          <div>
            <Label htmlFor="c-also-supplier" className="font-medium">Also a Supplier</Label>
            <p className="text-xs text-muted-foreground">Whether this customer is also a supplier to your organization</p>
          </div>
        </div>
      </FormSubsection>
    </FormSection>
  );
}

export function DocumentsPlaceholder() {
  return (
    <div className="mt-6 flex items-center justify-between rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Documents &amp; Contracts</h3>
        <p className="text-xs text-muted-foreground">Manage files, tax IDs, and contracts for this customer. Coming soon.</p>
      </div>
      <Button type="button" variant="outline" size="sm" disabled className={BUTTON_PRESS}>
        <FileText className="h-4 w-4" />
        Manage Documents
      </Button>
    </div>
  );
}
