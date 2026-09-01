import { Field, Float, ObjectType } from "@nestjs/graphql";
import { TaxRateModel } from "./tax-rate.model";

@ObjectType()
export class TaxGroupModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => [TaxRateModel])
  taxRates!: TaxRateModel[];

  @Field(() => Float)
  totalRate!: number;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
