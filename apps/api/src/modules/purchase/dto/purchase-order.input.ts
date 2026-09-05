import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PurchaseOrderTaxMethod } from "@abms/database";
import { AddressSnapshotInput } from "./address.input";

@InputType()
export class PurchaseOrderItemInput {
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
  unitCost!: number;

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
export class CreatePurchaseOrderInput {
  @Field(() => String)
  @IsString()
  supplierId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(PurchaseOrderTaxMethod)
  taxMethod?: PurchaseOrderTaxMethod;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  supplierNotes?: string;

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

  @Field(() => AddressSnapshotInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapshotInput)
  supplierAddress?: AddressSnapshotInput;

  @Field(() => AddressSnapshotInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapshotInput)
  deliveryAddress?: AddressSnapshotInput;

  @Field(() => [PurchaseOrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInput)
  items!: PurchaseOrderItemInput[];
}
