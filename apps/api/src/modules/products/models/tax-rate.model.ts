import { Field, Float, ObjectType, registerEnumType } from "@nestjs/graphql";
import { TaxType } from "@abms/shared";

registerEnumType(TaxType, { name: "TaxType" });

@ObjectType()
export class TaxRateModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => Float)
  rate!: number;

  @Field(() => TaxType)
  taxType!: TaxType;

  @Field(() => String, { nullable: true })
  country?: string | null;

  @Field(() => String, { nullable: true })
  state?: string | null;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
