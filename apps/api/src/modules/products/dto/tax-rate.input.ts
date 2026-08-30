import { Field, Float, InputType } from "@nestjs/graphql";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { TaxType } from "@abms/shared";

@InputType()
export class CreateTaxRateInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(100)
  rate!: number;

  @Field(() => TaxType, { nullable: true })
  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  region?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@InputType()
export class UpdateTaxRateInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate?: number;

  @Field(() => TaxType, { nullable: true })
  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  region?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
