import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

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

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitCost!: number;

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

  @Field(() => String)
  createdByName!: string;

  @Field(() => [PurchaseOrderItemModel])
  items!: PurchaseOrderItemModel[];

  @Field(() => Float)
  subtotal!: number;

  @Field(() => Boolean)
  hasBill!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
