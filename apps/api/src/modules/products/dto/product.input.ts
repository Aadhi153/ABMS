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
  variantName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  barcode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  brandId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxRateId?: string;

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

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStockLevel?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
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
  variantName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  barcode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  brandId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxRateId?: string;

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

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStockLevel?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
