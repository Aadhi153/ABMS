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

  @Field(() => Float, { nullable: true })
  minOrderValue?: number | null;

  @Field(() => String, { nullable: true })
  customerTag?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
