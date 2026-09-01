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

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String)
  currency!: string;

  @Field(() => String, { nullable: true })
  zone?: string | null;

  @Field(() => Boolean)
  priceSyncEnabled!: boolean;

  @Field(() => Boolean)
  productsAutoSyncEnabled!: boolean;

  @Field(() => Date, { nullable: true })
  startDate?: Date | null;

  @Field(() => Date, { nullable: true })
  endDate?: Date | null;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => [PriceListItemModel])
  items!: PriceListItemModel[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
