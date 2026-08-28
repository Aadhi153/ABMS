import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PriceListItemModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String, { nullable: true })
  productName?: string;

  @Field(() => Float)
  price!: number;
}

@ObjectType()
export class PriceListModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => [PriceListItemModel])
  items!: PriceListItemModel[];

  @Field(() => Date)
  createdAt!: Date;
}
