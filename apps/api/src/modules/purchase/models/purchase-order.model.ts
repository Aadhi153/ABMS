import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { AddressSnapshotModel } from "./address.model";

@ObjectType()
export class PurchaseOrderItemModel {
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

  @Field(() => Int)
  receivedQuantity!: number;

  @Field(() => Float)
  lineTotal!: number;
}

@ObjectType()
export class PurchaseOrderModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  poNumber!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  supplierId!: string;

  @Field(() => String)
  supplierName!: string;

  @Field(() => Date, { nullable: true })
  expectedDeliveryDate?: Date | null;

  @Field(() => String, { nullable: true })
  trackingCode?: string | null;

  @Field(() => String)
  currency!: string;

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
  supplierAddress?: AddressSnapshotModel | null;

  @Field(() => AddressSnapshotModel, { nullable: true })
  deliveryAddress?: AddressSnapshotModel | null;

  @Field(() => String)
  createdByName!: string;

  @Field(() => [PurchaseOrderItemModel])
  items!: PurchaseOrderItemModel[];

  @Field(() => Float)
  shippingAmount!: number;

  @Field(() => Float)
  subtotal!: number;

  @Field(() => Float)
  discountAmount!: number;

  @Field(() => Float)
  taxAmount!: number;

  @Field(() => Float)
  total!: number;

  @Field(() => Boolean)
  hasBill!: boolean;

  @Field(() => String, { nullable: true })
  billStatus?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
