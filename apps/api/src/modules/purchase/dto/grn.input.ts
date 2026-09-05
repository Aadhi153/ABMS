import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { GrnStatus, PurchaseOrderTaxMethod } from "@abms/database";
import { AddressSnapshotInput } from "./address.input";

@InputType()
export class GrnItemInput {
  @Field(() => String)
  @IsString()
  purchaseOrderItemId!: string;

  @Field(() => Int)
  @Min(1)
  quantityReceived!: number;

  @Field(() => Int)
  @Min(0)
  acceptedQuantity!: number;

  @Field(() => Int)
  @Min(0)
  rejectedQuantity!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  unitPrice?: number;

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
export class CreateGrnInput {
  @Field(() => String)
  @IsString()
  purchaseOrderId!: string;

  @Field(() => String)
  @IsString()
  warehouseId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(GrnStatus)
  status?: GrnStatus;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  qualityScore?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

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
  vendorAddress?: AddressSnapshotInput;

  @Field(() => AddressSnapshotInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapshotInput)
  deliveryAddress?: AddressSnapshotInput;

  @Field(() => [GrnItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrnItemInput)
  items!: GrnItemInput[];
}
