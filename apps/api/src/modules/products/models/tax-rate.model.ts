import { Field, Float, ObjectType, registerEnumType } from "@nestjs/graphql";
import { TaxType } from "@abms/shared";

registerEnumType(TaxType, { name: "TaxType" });

@ObjectType()
export class TaxRateModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Float)
  rate!: number;

  @Field(() => TaxType)
  taxType!: TaxType;

  @Field(() => String, { nullable: true })
  region?: string | null;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
