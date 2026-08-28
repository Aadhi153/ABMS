import { Field, Float, ObjectType, registerEnumType } from "@nestjs/graphql";
import { DiscountType } from "@abms/shared";

registerEnumType(DiscountType, { name: "DiscountType" });

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

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
