import { Field, Float, InputType } from "@nestjs/graphql";
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

@InputType()
export class CreatePricingTierInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;
}

@InputType()
export class UpdatePricingTierInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
