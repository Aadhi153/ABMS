export interface AddressSnapshot {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
  active: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  active: boolean;
}

export interface BankAccountOption {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
}

export interface PoItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsnSac: string | null;
  quantity: number;
  uom: string;
  unitCost: number;
  discountPct: number;
  taxPct: number;
  warehouseId: string | null;
  warehouseName: string | null;
  receivedQuantity: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  supplierId: string;
  supplierName: string;
  expectedDeliveryDate: string | null;
  trackingCode: string | null;
  currency: string;
  paymentTerms: string | null;
  taxMethod: string;
  supplierNotes: string | null;
  termsConditions: string | null;
  internalNotes: string | null;
  supplierAddress: AddressSnapshot | null;
  deliveryAddress: AddressSnapshot | null;
  createdByName: string;
  items: PoItem[];
  shippingAmount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  hasBill: boolean;
  billStatus: string | null;
  createdAt: string;
}

export interface GrnItem {
  id: string;
  purchaseOrderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  hsnSac: string | null;
  orderedQuantity: number;
  quantityReceived: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  batchNumber: string | null;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  warehouseId: string | null;
  warehouseName: string | null;
  lineTotal: number;
}

export interface Grn {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  receivedByName: string;
  status: string;
  qualityScore: number;
  taxId: string | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
  taxMethod: string;
  supplierNotes: string | null;
  termsConditions: string | null;
  internalNotes: string | null;
  vendorAddress: AddressSnapshot | null;
  deliveryAddress: AddressSnapshot | null;
  shippingAmount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  items: GrnItem[];
  createdAt: string;
}

export interface SupplierBillItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsnSac: string | null;
  quantity: number;
  uom: string;
  unitCost: number;
  discountPct: number;
  taxPct: number;
  warehouseId: string | null;
  warehouseName: string | null;
  lineTotal: number;
}

export interface SupplierBill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  poNumber: string | null;
  invoiceReference: string | null;
  invoiceDate: string;
  paymentTerms: string | null;
  taxMethod: string;
  supplierNotes: string | null;
  termsConditions: string | null;
  internalNotes: string | null;
  billingAddress: AddressSnapshot | null;
  shippingAddress: AddressSnapshot | null;
  items: SupplierBillItem[];
  shippingAmount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  amount: number;
  amountPaid: number;
  amountDebited: number;
  remaining: number;
  status: string;
  dueDate: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  billId: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  requestedById: string;
  requestedByName: string;
  approvedById: string | null;
  approvedByName: string | null;
  paidAt: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface DebitNoteItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  lineTotal: number;
}

export interface DebitNote {
  id: string;
  debitNoteNumber: string;
  billId: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  type: string;
  status: string;
  warehouseId: string | null;
  warehouseName: string | null;
  issueDate: string;
  dueDate: string | null;
  linkedDocId: string | null;
  taxId: string | null;
  settlementAccountId: string | null;
  settlementAccountName: string | null;
  taxMethod: string;
  supplierNotes: string | null;
  termsConditions: string | null;
  internalNotes: string | null;
  partnerAddress: AddressSnapshot | null;
  items: DebitNoteItem[];
  grossAmount: number;
  discountAmount: number;
  taxAmount: number;
  amount: number;
  reason: string;
  voidedAt: string | null;
  createdAt: string;
}
