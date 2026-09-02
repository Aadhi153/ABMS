import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class QuoteItemModel {
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
export class QuoteModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  quoteNumber!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  customerId!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Date, { nullable: true })
  validUntil?: Date | null;

  @Field(() => String, { nullable: true })
  reference?: string | null;

  @Field(() => String, { nullable: true })
  paymentTerms?: string | null;

  @Field(() => String, { nullable: true })
  priceListId?: string | null;

  @Field(() => String, { nullable: true })
  priceListName?: string | null;

  @Field(() => String)
  taxMethod!: string;

  @Field(() => String, { nullable: true })
  customerNotes?: string | null;

  @Field(() => String, { nullable: true })
  termsConditions?: string | null;

  @Field(() => String, { nullable: true })
  internalNotes?: string | null;

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

  @Field(() => String)
  createdByName!: string;

  @Field(() => [QuoteItemModel])
  items!: QuoteItemModel[];

  @Field(() => Date)
  createdAt!: Date;
}
