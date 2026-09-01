import { AddressType, BankAccountType, BusinessType, ContactMethodType } from "@abms/shared";

export const BUSINESS_TYPE_OPTIONS: Array<{ value: BusinessType; label: string }> = [
  { value: BusinessType.BUSINESS, label: "Business" },
  { value: BusinessType.INDIVIDUAL, label: "Individual" },
];

export const CONTACT_METHOD_OPTIONS: Array<{ value: ContactMethodType; label: string }> = [
  { value: ContactMethodType.PHONE, label: "Phone" },
  { value: ContactMethodType.EMAIL, label: "Email" },
  { value: ContactMethodType.WHATSAPP, label: "WhatsApp" },
  { value: ContactMethodType.FAX, label: "Fax" },
  { value: ContactMethodType.OTHER, label: "Other" },
];

export const ADDRESS_TYPE_OPTIONS: Array<{ value: AddressType; label: string }> = [
  { value: AddressType.BILLING, label: "Billing" },
  { value: AddressType.SHIPPING, label: "Shipping" },
  { value: AddressType.OTHER, label: "Other" },
];

export const BANK_ACCOUNT_TYPE_OPTIONS: Array<{ value: BankAccountType; label: string }> = [
  { value: BankAccountType.SAVINGS, label: "Savings Account" },
  { value: BankAccountType.CURRENT, label: "Current Account" },
];

/** Curated common payment terms — still stored as a free `paymentTerms: String` in the DB. */
export const PAYMENT_TERMS_OPTIONS: string[] = ["Due on Receipt", "COD", "Net 15", "Net 30", "Net 45", "Net 60"];

/** Common international dialing codes for the phone-country-code selector. */
export const PHONE_COUNTRY_CODES: Array<{ value: string; label: string }> = [
  { value: "+91", label: "IN +91" },
  { value: "+1", label: "US +1" },
  { value: "+44", label: "UK +44" },
  { value: "+61", label: "AU +61" },
  { value: "+971", label: "AE +971" },
  { value: "+65", label: "SG +65" },
  { value: "+49", label: "DE +49" },
  { value: "+33", label: "FR +33" },
  { value: "+81", label: "JP +81" },
  { value: "+86", label: "CN +86" },
];
