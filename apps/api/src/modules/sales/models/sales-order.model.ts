import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SalesOrderItemModel {
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

  @Field(() => Float)
  unitPrice!: number;

  @Field(() => Float)
  lineTotal!: number;
}

@ObjectType()
export class SalesOrderModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  orderNumber!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  customerId!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => String, { nullable: true })
  dealId?: string | null;

  @Field(() => String)
  createdByName!: string;

  @Field(() => [SalesOrderItemModel])
  items!: SalesOrderItemModel[];

  @Field(() => Float)
  subtotal!: number;

  @Field(() => Boolean)
  hasInvoice!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
