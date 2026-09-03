import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { SalesOrderTaxMethod } from "@abms/database";

@InputType()
export class SalesOrderItemInput {
  @Field(() => String)
  @IsString()
  productId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  hsnSac?: string;

  @Field(() => Int)
  @Min(1)
  quantity!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  uom?: string;

  @Field(() => Float)
  @Min(0)
  unitPrice!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  discountPct?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  taxPct?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

@InputType()
export class CreateSalesOrderInput {
  @Field(() => String)
  @IsString()
  customerId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dealId?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  promisedDate?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reference?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  priceListId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(SalesOrderTaxMethod)
  taxMethod?: SalesOrderTaxMethod;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  termsConditions?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  shippingAmount?: number;

  @Field(() => [SalesOrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemInput)
  items!: SalesOrderItemInput[];
}
