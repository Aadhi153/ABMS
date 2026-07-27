import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class GrnItemModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  productName!: string;

  @Field(() => Int)
  quantityReceived!: number;
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
  warehouseName!: string;

  @Field(() => String)
  receivedByName!: string;

  @Field(() => [GrnItemModel])
  items!: GrnItemModel[];

  @Field(() => Date)
  createdAt!: Date;
}
