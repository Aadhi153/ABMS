import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class TaxRateModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Float)
  rate!: number;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
