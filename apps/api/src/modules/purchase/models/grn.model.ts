import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { AddressSnapshotModel } from "./address.model";

@ObjectType()
export class GrnItemModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  purchaseOrderItemId!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String)
  productName!: string;

  @Field(() => String)
  sku!: string;

  @Field(() => String, { nullable: true })
  hsnSac?: string | null;

  @Field(() => Int)
  orderedQuantity!: number;

  @Field(() => Int)
  quantityReceived!: number;

  @Field(() => Int)
  acceptedQuantity!: number;

  @Field(() => Int)
  rejectedQuantity!: number;

  @Field(() => String, { nullable: true })
  batchNumber?: string | null;

  @Field(() => Float)
  unitPrice!: number;

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
export class GoodsReceivedNoteModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  grnNumber!: string;

  @Field(() => String)
  purchaseOrderId!: string;

  @Field(() => String)
  poNumber!: string;

  @Field(() => String)
  supplierId!: string;

  @Field(() => String)
  supplierName!: string;

  @Field(() => String)
  warehouseId!: string;

  @Field(() => String)
  warehouseName!: string;

  @Field(() => String)
  receivedByName!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Int)
  qualityScore!: number;

  @Field(() => String, { nullable: true })
  taxId?: string | null;

  @Field(() => String, { nullable: true })
  bankAccountId?: string | null;

  @Field(() => String, { nullable: true })
  bankAccountName?: string | null;

  @Field(() => String)
  taxMethod!: string;

  @Field(() => String, { nullable: true })
  supplierNotes?: string | null;

  @Field(() => String, { nullable: true })
  termsConditions?: string | null;

  @Field(() => String, { nullable: true })
  internalNotes?: string | null;

  @Field(() => AddressSnapshotModel, { nullable: true })
  vendorAddress?: AddressSnapshotModel | null;

  @Field(() => AddressSnapshotModel, { nullable: true })
  deliveryAddress?: AddressSnapshotModel | null;

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

  @Field(() => [GrnItemModel])
  items!: GrnItemModel[];

  @Field(() => Date)
  createdAt!: Date;
}
