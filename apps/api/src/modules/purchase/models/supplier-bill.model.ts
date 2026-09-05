import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { AddressSnapshotModel } from "./address.model";

@ObjectType()
export class SupplierBillItemModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String)
  productName!: string;

  @Field(() => String)
  sku!: string;

  @Field(() => String, { nullable: true })
  hsnSac?: string | null;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String)
  uom!: string;

  @Field(() => Float)
  unitCost!: number;

  @Field(() => Float)
  discountPct!: number;

  @Field(() => Float)
  taxPct!: number;

  @Field(() => String, { nullable: true })
  warehouseId?: string | null;

  @Field(() => String, { nullable: true })
  warehouseName?: string | null;

  @Field(() => Float)
  lineTotal!: number;
}

@ObjectType()
export class SupplierBillModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  billNumber!: string;

  @Field(() => String)
  supplierId!: string;

  @Field(() => String)
  supplierName!: string;

  @Field(() => String, { nullable: true })
  purchaseOrderId?: string | null;

  @Field(() => String, { nullable: true })
  poNumber?: string | null;

  @Field(() => String, { nullable: true })
  invoiceReference?: string | null;

  @Field(() => Date)
  invoiceDate!: Date;

  @Field(() => String, { nullable: true })
  paymentTerms?: string | null;

  @Field(() => String)
  taxMethod!: string;

  @Field(() => String, { nullable: true })
  supplierNotes?: string | null;

  @Field(() => String, { nullable: true })
  termsConditions?: string | null;

  @Field(() => String, { nullable: true })
  internalNotes?: string | null;

  @Field(() => AddressSnapshotModel, { nullable: true })
  billingAddress?: AddressSnapshotModel | null;

  @Field(() => AddressSnapshotModel, { nullable: true })
  shippingAddress?: AddressSnapshotModel | null;

  @Field(() => [SupplierBillItemModel])
  items!: SupplierBillItemModel[];

  @Field(() => Float)
  shippingAmount!: number;

  @Field(() => Float)
  subtotal!: number;

  @Field(() => Float)
  discountAmount!: number;

  @Field(() => Float)
  taxAmount!: number;

  @Field(() => Float)
  amount!: number;

  @Field(() => Float)
  amountPaid!: number;

  @Field(() => Float)
  amountDebited!: number;

  @Field(() => Float)
  remaining!: number;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  dueDate!: Date;

  @Field(() => Date)
  createdAt!: Date;
}
