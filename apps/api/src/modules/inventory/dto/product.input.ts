import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreateProductInput {
  @Field(() => String)
  @IsString()
  sku!: string;

  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  costPrice!: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  sellPrice!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;
}

@InputType()
export class UpdateProductInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellPrice?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class StockAdjustmentInput {
  @Field(() => String)
  @IsString()
  productId!: string;

  @Field(() => String)
  @IsString()
  warehouseId!: string;

  @Field(() => Int)
  @IsInt()
  quantity!: number;

  @Field(() => String)
  @IsString()
  reason!: string;
}
