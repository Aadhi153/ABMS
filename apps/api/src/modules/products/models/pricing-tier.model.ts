import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PricingTierModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Float)
  discountPercent!: number;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
