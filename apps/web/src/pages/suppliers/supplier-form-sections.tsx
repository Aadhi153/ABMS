import { Building2, FileText, Landmark, MapPin, Phone, Plus, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { AddressType, BankAccountType, BusinessType, ContactMethodType } from "@abms/shared";
import { Button, Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, cn } from "@abms/ui";
import { FormSection, FormSubsection, RequiredMark, FieldError } from "../products/form-page";
import { FOCUS_GLOW, BUTTON_PRESS } from "../products/form-motion";
import { COUNTRIES } from "../../lib/geo";
import {
  ADDRESS_TYPE_OPTIONS,
  BANK_ACCOUNT_TYPE_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  PHONE_COUNTRY_CODES,
} from "../../lib/party-options";

export interface SupplierContactRow {
  type: ContactMethodType;
  value: string;
  isPrimary: boolean;
}

export interface SupplierAddressRow {
  type: AddressType;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface SupplierBankAccountRow {
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
}

export interface SupplierFormState {
  name: string;
  type: BusinessType;
  contactPerson: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  website: string;
  taxId: string;
  leadTime: string;
  minOrderValue: string;
  notes: string;
  creditLimit: string;
  paymentTerms: string;
  active: boolean;
  isAlsoCustomer: boolean;
  contacts: SupplierContactRow[];
  addresses: SupplierAddressRow[];
  bankAccounts: SupplierBankAccountRow[];
}

export function emptySupplierForm(): SupplierFormState {
  return {
    name: "",
    type: BusinessType.BUSINESS,
    contactPerson: "",
    email: "",
    phoneCountryCode: "+91",
    phone: "",
    website: "",
    taxId: "",
    leadTime: "",
    minOrderValue: "",
    notes: "",
    creditLimit: "",
    paymentTerms: "",
    active: true,
    isAlsoCustomer: false,
    contacts: [],
    addresses: [],
    bankAccounts: [],
  };
}

export interface SupplierRecord {
  name: string;
  type: BusinessType;
  contactPerson?: string | null;
  email?: string | null;
  phoneCountryCode?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  leadTime?: number | null;
  minOrderValue?: number | null;
  notes?: string | null;
  creditLimit?: number | null;
  paymentTerms?: string | null;
  active: boolean;
  isAlsoCustomer: boolean;
  contacts: Array<{ type: ContactMethodType; value: string; isPrimary: boolean }>;
  addresses: Array<{ type: AddressType; addressLine1: string; addressLine2?: string | null; city: string; state: string; postalCode: string; country: string }>;
  bankAccounts: Array<{ bankName: string; bankBranch: string; accountNumber: string; ifscCode: string; accountType: BankAccountType }>;
}

export function supplierToFormState(s: SupplierRecord): SupplierFormState {
  return {
    name: s.name,
    type: s.type,
    contactPerson: s.contactPerson ?? "",
    email: s.email ?? "",
    phoneCountryCode: s.phoneCountryCode ?? "+91",
    phone: s.phone ?? "",
    website: s.website ?? "",
    taxId: s.taxId ?? "",
    leadTime: s.leadTime != null ? String(s.leadTime) : "",
    minOrderValue: s.minOrderValue != null ? String(s.minOrderValue) : "",
    notes: s.notes ?? "",
    creditLimit: s.creditLimit != null ? String(s.creditLimit) : "",
    paymentTerms: s.paymentTerms ?? "",
    active: s.active,
    isAlsoCustomer: s.isAlsoCustomer,
    contacts: s.contacts.map((c) => ({ type: c.type, value: c.value, isPrimary: c.isPrimary })),
    addresses: s.addresses.map((a) => ({
      type: a.type,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? "",
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
    })),
    bankAccounts: s.bankAccounts.map((b) => ({
      bankName: b.bankName,
      bankBranch: b.bankBranch,
      accountNumber: b.accountNumber,
      ifscCode: b.ifscCode,
      accountType: b.accountType,
    })),
  };
}

interface SectionProps {
  form: SupplierFormState;
  setForm: (updater: (f: SupplierFormState) => SupplierFormState) => void;
  nameError?: string | null;
}

export function BasicInfoSection({ form, setForm, nameError }: SectionProps) {
  return (
    <FormSection title="Basic Information" description="Enter the basic information for your supplier" icon={<Building2 className="h-5 w-5" />} index={0}>
      <FormSubsection title="Identity" description="Name and business classification">
        <div className="space-y-1.5">
          <Label htmlFor="s-name">
            Supplier Name
            <RequiredMark />
          </Label>
          <Input id="s-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={FOCUS_GLOW} />
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
          <Label htmlFor="s-contact-person">Contact Person</Label>
          <Input id="s-contact-person" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>

      <FormSubsection title="Contact" description="How to reach this supplier">
        <div className="space-y-1.5">
          <Label htmlFor="s-email">Email</Label>
          <Input id="s-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-phone">Phone</Label>
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
            <Input id="s-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={cn("flex-1", FOCUS_GLOW)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-website">Website</Label>
          <Input id="s-website" placeholder="https://example.com" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-tax-id">Tax ID</Label>
          <Input id="s-tax-id" value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>

      <FormSubsection title="Terms" description="Lead time and minimum order value">
        <div className="space-y-1.5">
          <Label htmlFor="s-lead-time">Lead Time (days)</Label>
          <Input id="s-lead-time" type="number" min="0" placeholder="e.g., 7" value={form.leadTime} onChange={(e) => setForm((f) => ({ ...f, leadTime: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-min-order">Min Order Value</Label>
          <Input id="s-min-order" type="number" min="0" step="0.01" value={form.minOrderValue} onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))} className={FOCUS_GLOW} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="s-notes">Notes</Label>
          <Textarea id="s-notes" rows={3} placeholder="Additional notes about the supplier…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>
    </FormSection>
  );
}

export function AddressesSection({ form, setForm }: SectionProps) {
  function addAddress() {
    setForm((f) => ({
      ...f,
      addresses: [...f.addresses, { type: AddressType.BILLING, addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "" }],
    }));
  }
  function removeAddress(idx: number) {
    setForm((f) => ({ ...f, addresses: f.addresses.filter((_, i) => i !== idx) }));
  }
  function updateAddress(idx: number, patch: Partial<SupplierAddressRow>) {
    setForm((f) => ({ ...f, addresses: f.addresses.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }));
  }

  return (
    <FormSection title="Addresses" description="Manage supplier addresses for billing and shipping" icon={<MapPin className="h-5 w-5" />} index={0}>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="xs" onClick={addAddress} className={BUTTON_PRESS}>
          <Plus className="h-3.5 w-3.5" />
          Add Address
        </Button>
      </div>
      {form.addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No addresses added yet.</p>
      ) : (
        form.addresses.map((addr, idx) => (
          <FormSubsection key={idx} title={`Address ${idx + 1}`} className="sm:grid-cols-1">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(idx)} aria-label="Remove address">
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={addr.type} onValueChange={(v) => updateAddress(idx, { type: v as AddressType })}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADDRESS_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 1</Label>
                <Input value={addr.addressLine1} onChange={(e) => updateAddress(idx, { addressLine1: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 2</Label>
                <Input placeholder="Apartment, suite, etc." value={addr.addressLine2} onChange={(e) => updateAddress(idx, { addressLine2: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={addr.city} onChange={(e) => updateAddress(idx, { city: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={addr.state} onChange={(e) => updateAddress(idx, { state: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Postal Code</Label>
                <Input value={addr.postalCode} onChange={(e) => updateAddress(idx, { postalCode: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select value={addr.country} onValueChange={(v) => updateAddress(idx, { country: v })}>
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
        ))
      )}
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
  function updateContact(idx: number, patch: Partial<SupplierContactRow>) {
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, i) => (i === idx ? { ...c, ...patch } : c)) }));
  }

  return (
    <FormSection title="Additional Contacts" description="Add alternative contact methods for this supplier" icon={<Phone className="h-5 w-5" />} index={0}>
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
              <Input placeholder="10 digits only" value={contact.value} onChange={(e) => updateContact(idx, { value: e.target.value })} className={FOCUS_GLOW} />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox checked={contact.isPrimary} onCheckedChange={(v) => updateContact(idx, { isPrimary: v })} id={`s-contact-primary-${idx}`} />
              <Label htmlFor={`s-contact-primary-${idx}`} className="font-normal">
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

export function BankDetailsSection({ form, setForm }: SectionProps) {
  function addBankAccount() {
    setForm((f) => ({
      ...f,
      bankAccounts: [...f.bankAccounts, { bankName: "", bankBranch: "", accountNumber: "", ifscCode: "", accountType: BankAccountType.SAVINGS }],
    }));
  }
  function removeBankAccount(idx: number) {
    setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.filter((_, i) => i !== idx) }));
  }
  function updateBankAccount(idx: number, patch: Partial<SupplierBankAccountRow>) {
    setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.map((b, i) => (i === idx ? { ...b, ...patch } : b)) }));
  }

  return (
    <FormSection title="Bank Details" description="Add bank account details for this supplier. Multiple accounts are supported." icon={<Landmark className="h-5 w-5" />} index={0}>
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="xs" onClick={addBankAccount} className={BUTTON_PRESS}>
          <Plus className="h-3.5 w-3.5" />
          Add Bank Account
        </Button>
      </div>
      {form.bankAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bank accounts added yet.</p>
      ) : (
        form.bankAccounts.map((bank, idx) => (
          <FormSubsection key={idx} title={`Bank Account ${idx + 1}`} className="sm:grid-cols-1">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => removeBankAccount(idx)} aria-label="Remove bank account">
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Bank Name
                  <RequiredMark />
                </Label>
                <Input placeholder="e.g., State Bank of India" value={bank.bankName} onChange={(e) => updateBankAccount(idx, { bankName: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Bank Branch
                  <RequiredMark />
                </Label>
                <Input placeholder="e.g., Main Branch, Mumbai" value={bank.bankBranch} onChange={(e) => updateBankAccount(idx, { bankBranch: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Account Number
                  <RequiredMark />
                </Label>
                <Input placeholder="e.g., 1234567890" value={bank.accountNumber} onChange={(e) => updateBankAccount(idx, { accountNumber: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  IFSC Code
                  <RequiredMark />
                </Label>
                <Input placeholder="e.g., SBIN0001234" value={bank.ifscCode} onChange={(e) => updateBankAccount(idx, { ifscCode: e.target.value })} className={FOCUS_GLOW} />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Account Type
                  <RequiredMark />
                </Label>
                <Select value={bank.accountType} onValueChange={(v) => updateBankAccount(idx, { accountType: v as BankAccountType })}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_ACCOUNT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSubsection>
        ))
      )}
    </FormSection>
  );
}

export function SettingsSection({ form, setForm }: SectionProps) {
  return (
    <FormSection title="Business Settings" description="Configure payment terms and business relationship settings" icon={<SettingsIcon className="h-5 w-5" />} index={0}>
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
          <Label htmlFor="s-credit-limit">Credit Limit</Label>
          <Input id="s-credit-limit" type="number" step="0.01" min="0" placeholder="Enter credit limit amount" value={form.creditLimit} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} className={FOCUS_GLOW} />
        </div>
      </FormSubsection>
      <FormSubsection title="Status" className="sm:grid-cols-1">
        <div className="flex items-center gap-3">
          <Checkbox checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} id="s-active" />
          <div>
            <Label htmlFor="s-active" className="font-medium">Active Supplier</Label>
            <p className="text-xs text-muted-foreground">Active suppliers can be used in transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox checked={form.isAlsoCustomer} onCheckedChange={(v) => setForm((f) => ({ ...f, isAlsoCustomer: v }))} id="s-also-customer" />
          <div>
            <Label htmlFor="s-also-customer" className="font-medium">Also a Customer</Label>
            <p className="text-xs text-muted-foreground">Check if this supplier is also a customer</p>
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
        <p className="text-xs text-muted-foreground">Manage files, tax IDs, and contracts for this supplier. Coming soon.</p>
      </div>
      <Button type="button" variant="outline" size="sm" disabled className={BUTTON_PRESS}>
        <FileText className="h-4 w-4" />
        Manage Documents
      </Button>
    </div>
  );
}
