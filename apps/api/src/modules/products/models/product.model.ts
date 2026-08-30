import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { WarehouseModel } from "../../settings/models/warehouse.model";
import { CategoryModel } from "./category.model";
import { BrandModel } from "./brand.model";
import { TaxRateModel } from "./tax-rate.model";

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
  variantName?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  barcode?: string | null;

  @Field(() => String, { nullable: true })
  imageUrl?: string | null;

  @Field(() => String, { nullable: true })
  categoryId?: string | null;

  @Field(() => CategoryModel, { nullable: true })
  category?: CategoryModel | null;

  @Field(() => String, { nullable: true })
  brandId?: string | null;

  @Field(() => BrandModel, { nullable: true })
  brand?: BrandModel | null;

  @Field(() => String, { nullable: true })
  taxRateId?: string | null;

  @Field(() => TaxRateModel, { nullable: true })
  taxRate?: TaxRateModel | null;

  @Field(() => String)
  unitOfMeasure!: string;

  @Field(() => Float)
  costPrice!: number;

  @Field(() => Float)
  sellPrice!: number;

  @Field(() => Boolean)
  trackInventory!: boolean;

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
