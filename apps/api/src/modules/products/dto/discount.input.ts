import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { DiscountAppliesTo, DiscountType } from "@abms/shared";

@InputType()
export class CreateDiscountInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => DiscountType)
  @IsEnum(DiscountType)
  type!: DiscountType;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  value!: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field(() => DiscountAppliesTo, { nullable: true })
  @IsOptional()
  @IsEnum(DiscountAppliesTo)
  appliesTo?: DiscountAppliesTo;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  brandId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

@InputType()
export class UpdateDiscountInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => DiscountType, { nullable: true })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field(() => DiscountAppliesTo, { nullable: true })
  @IsOptional()
  @IsEnum(DiscountAppliesTo)
  appliesTo?: DiscountAppliesTo;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  brandId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
