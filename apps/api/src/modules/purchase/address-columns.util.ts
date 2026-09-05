import type { AddressSnapshotInput } from "./dto/address.input";

export function addressToColumns(prefix: string, addr?: AddressSnapshotInput) {
  return {
    [`${prefix}Line1`]: addr?.line1,
    [`${prefix}Line2`]: addr?.line2,
    [`${prefix}City`]: addr?.city,
    [`${prefix}State`]: addr?.state,
    [`${prefix}PostalCode`]: addr?.postalCode,
    [`${prefix}Country`]: addr?.country,
  };
}

export function columnsToAddress<T extends Record<string, unknown>>(row: T, prefix: string) {
  const line1 = row[`${prefix}Line1`] as string | null;
  const line2 = row[`${prefix}Line2`] as string | null;
  const city = row[`${prefix}City`] as string | null;
  const state = row[`${prefix}State`] as string | null;
  const postalCode = row[`${prefix}PostalCode`] as string | null;
  const country = row[`${prefix}Country`] as string | null;
  if (!line1 && !line2 && !city && !state && !postalCode && !country) return null;
  return { line1, line2, city, state, postalCode, country };
}
