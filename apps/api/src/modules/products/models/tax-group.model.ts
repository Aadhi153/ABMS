import { Field, ObjectType } from "@nestjs/graphql";
import { TaxRateModel } from "./tax-rate.model";

@ObjectType()
export class TaxGroupModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => [TaxRateModel])
  taxRates!: TaxRateModel[];

  @Field(() => Date)
  createdAt!: Date;
}
