import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { WarehouseModel } from "../../settings/models/warehouse.model";

@ObjectType()
export class StockLevelModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => WarehouseModel)
  warehouse!: WarehouseModel;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class ProductModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  sku!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String)
  unitOfMeasure!: string;

  @Field(() => Float)
  costPrice!: number;

  @Field(() => Float)
  sellPrice!: number;

  @Field(() => Int)
  reorderThreshold!: number;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  totalStock!: number;

  @Field(() => [StockLevelModel])
  stockLevels!: StockLevelModel[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
