import { Field, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { StockTrackingMethod } from "@abms/shared";

registerEnumType(StockTrackingMethod, { name: "StockTrackingMethod" });

@ObjectType()
export class OrgSettingsModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  companyName!: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string | null;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => String, { nullable: true })
  taxId?: string | null;

  @Field(() => String)
  defaultCurrency!: string;

  @Field(() => StockTrackingMethod)
  stockTrackingMethod!: StockTrackingMethod;

  @Field(() => Int)
  sessionTimeoutMins!: number;

  @Field(() => Int)
  passwordMinLength!: number;

  @Field(() => Boolean)
  twoFactorRequired!: boolean;

  @Field(() => Date)
  updatedAt!: Date;
}
