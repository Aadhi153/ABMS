import { Field, InputType, Int } from "@nestjs/graphql";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { StockTrackingMethod } from "@abms/shared";

@InputType()
export class UpdateOrgSettingsInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  companyName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @Field(() => StockTrackingMethod, { nullable: true })
  @IsOptional()
  @IsEnum(StockTrackingMethod)
  stockTrackingMethod?: StockTrackingMethod;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(5)
  sessionTimeoutMins?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(4)
  passwordMinLength?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  twoFactorRequired?: boolean;
}
