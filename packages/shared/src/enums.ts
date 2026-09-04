// --- CRM ---
export enum DealStage {
  LEAD = "LEAD",
  QUALIFIED = "QUALIFIED",
  PROPOSAL = "PROPOSAL",
  WON = "WON",
  LOST = "LOST",
}

export enum TaskStatus {
  OPEN = "OPEN",
  DONE = "DONE",
}

export enum ActivityType {
  CALL = "CALL",
  EMAIL = "EMAIL",
  MEETING = "MEETING",
  NOTE = "NOTE",
}

// --- Products ---
export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
}

export enum DiscountAppliesTo {
  ALL = "ALL",
  CATEGORY = "CATEGORY",
  BRAND = "BRAND",
}

export enum TaxType {
  GST = "GST",
  VAT = "VAT",
  SALES_TAX = "SALES_TAX",
  OTHER = "OTHER",
}

// --- Inventory ---
export enum StockMovementType {
  SALE = "SALE",
  PURCHASE = "PURCHASE",
  ADJUSTMENT = "ADJUSTMENT",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
}

export enum StockTrackingMethod {
  FIFO = "FIFO",
  LIFO = "LIFO",
}

// --- Sales ---
export enum SalesOrderStatus {
  DRAFT = "DRAFT",
  CONFIRMED = "CONFIRMED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum QuoteStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  WON = "WON",
  LOST = "LOST",
  EXPIRED = "EXPIRED",
}

export enum QuoteTaxMethod {
  EXCLUSIVE = "EXCLUSIVE",
  INCLUSIVE = "INCLUSIVE",
}

export enum SalesOrderTaxMethod {
  EXCLUSIVE = "EXCLUSIVE",
  INCLUSIVE = "INCLUSIVE",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}

export enum PaymentMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  CARD = "CARD",
  CHEQUE = "CHEQUE",
  OTHER = "OTHER",
}

// --- Purchase ---
export enum PurchaseOrderStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED",
  RECEIVED = "RECEIVED",
  CANCELLED = "CANCELLED",
}

export enum SupplierBillStatus {
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}

// --- Accounts ---
export enum LedgerEntryType {
  RECEIVABLE = "RECEIVABLE",
  PAYABLE = "PAYABLE",
  EXPENSE = "EXPENSE",
  REVENUE = "REVENUE",
}

export enum AgingBucket {
  CURRENT = "0_30",
  DAYS_31_60 = "31_60",
  DAYS_60_PLUS = "60_PLUS",
}

// --- Customers & Suppliers ---
export enum BusinessType {
  BUSINESS = "BUSINESS",
  INDIVIDUAL = "INDIVIDUAL",
}

export enum ContactMethodType {
  PHONE = "PHONE",
  EMAIL = "EMAIL",
  WHATSAPP = "WHATSAPP",
  FAX = "FAX",
  OTHER = "OTHER",
}

export enum AddressType {
  BILLING = "BILLING",
  SHIPPING = "SHIPPING",
  OTHER = "OTHER",
}

export enum BankAccountType {
  SAVINGS = "SAVINGS",
  CURRENT = "CURRENT",
}

// --- Approvals ---
export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

// --- Audit / Notifications ---
export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export enum NotificationType {
  LOW_STOCK = "LOW_STOCK",
  INVOICE_OVERDUE = "INVOICE_OVERDUE",
  DEAL_WON = "DEAL_WON",
  APPROVAL_NEEDED = "APPROVAL_NEEDED",
  GENERIC = "GENERIC",
}

/** Shared "status pill" color mapping — keep in sync with packages/ui StatusBadge. */
export type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

export const STATUS_TONE: Record<string, StatusTone> = {
  // success
  WON: "success",
  PAID: "success",
  DELIVERED: "success",
  RECEIVED: "success",
  APPROVED: "success",
  ACCEPTED: "success",
  // warning
  PENDING: "warning",
  PARTIAL: "warning",
  PARTIALLY_RECEIVED: "warning",
  SENT: "warning",
  // danger
  LOST: "danger",
  OVERDUE: "danger",
  CANCELLED: "danger",
  REJECTED: "danger",
  EXPIRED: "danger",
  // info
  DRAFT: "info",
  QUALIFIED: "info",
  PROPOSAL: "info",
  CONFIRMED: "info",
  // neutral fallback
  LEAD: "muted",
  UNPAID: "muted",
  OPEN: "muted",
};
