import { Field, Float, InputType } from "@nestjs/graphql";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { DiscountType } from "@abms/shared";

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

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
