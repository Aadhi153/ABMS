import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { AddressSnapshotModel } from "./address.model";

@ObjectType()
export class DebitNoteItemModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String)
  productName!: string;

  @Field(() => String)
  sku!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String)
  uom!: string;

  @Field(() => Float)
  unitPrice!: number;

  @Field(() => Float)
  discountPct!: number;

  @Field(() => Float)
  taxPct!: number;

  @Field(() => Float)
  lineTotal!: number;
}

@ObjectType()
export class DebitNoteModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  debitNoteNumber!: string;

  @Field(() => String)
  billId!: string;

  @Field(() => String)
  billNumber!: string;

  @Field(() => String)
  supplierId!: string;

  @Field(() => String)
  supplierName!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  warehouseId?: string | null;

  @Field(() => String, { nullable: true })
  warehouseName?: string | null;

  @Field(() => Date)
  issueDate!: Date;

  @Field(() => Date, { nullable: true })
  dueDate?: Date | null;

  @Field(() => String, { nullable: true })
  linkedDocId?: string | null;

  @Field(() => String, { nullable: true })
  taxId?: string | null;

  @Field(() => String, { nullable: true })
  settlementAccountId?: string | null;

  @Field(() => String, { nullable: true })
  settlementAccountName?: string | null;

  @Field(() => String)
  taxMethod!: string;

  @Field(() => String, { nullable: true })
  supplierNotes?: string | null;

  @Field(() => String, { nullable: true })
  termsConditions?: string | null;

  @Field(() => String, { nullable: true })
  internalNotes?: string | null;

  @Field(() => AddressSnapshotModel, { nullable: true })
  partnerAddress?: AddressSnapshotModel | null;

  @Field(() => [DebitNoteItemModel])
  items!: DebitNoteItemModel[];

  @Field(() => Float)
  grossAmount!: number;

  @Field(() => Float)
  discountAmount!: number;

  @Field(() => Float)
  taxAmount!: number;

  @Field(() => Float)
  amount!: number;

  @Field(() => String)
  reason!: string;

  @Field(() => Date, { nullable: true })
  voidedAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;
}
