import { Field, Float, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { DiscountAppliesTo, DiscountType } from "@abms/shared";
import { CategoryModel } from "./category.model";
import { BrandModel } from "./brand.model";

registerEnumType(DiscountType, { name: "DiscountType" });
registerEnumType(DiscountAppliesTo, { name: "DiscountAppliesTo" });

@ObjectType()
export class DiscountModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => DiscountType)
  type!: DiscountType;

  @Field(() => Float)
  value!: number;

  @Field(() => Date, { nullable: true })
  startDate?: Date | null;

  @Field(() => Date, { nullable: true })
  endDate?: Date | null;

  @Field(() => DiscountAppliesTo)
  appliesTo!: DiscountAppliesTo;

  @Field(() => String, { nullable: true })
  categoryId?: string | null;

  @Field(() => CategoryModel, { nullable: true })
  category?: CategoryModel | null;

  @Field(() => String, { nullable: true })
  brandId?: string | null;

  @Field(() => BrandModel, { nullable: true })
  brand?: BrandModel | null;

  @Field(() => Int, { nullable: true })
  usageLimit?: number | null;

  @Field(() => String, { nullable: true })
  couponCode?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
