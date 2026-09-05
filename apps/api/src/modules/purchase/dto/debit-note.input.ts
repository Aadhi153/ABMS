import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { DebitNoteType, PurchaseOrderTaxMethod } from "@abms/database";
import { AddressSnapshotInput } from "./address.input";

@InputType()
export class DebitNoteItemInput {
  @Field(() => String)
  @IsString()
  productId!: string;

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
}

@InputType()
export class CreateDebitNoteInput {
  @Field(() => String)
  @IsString()
  billId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(DebitNoteType)
  type?: DebitNoteType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  linkedDocId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  settlementAccountId?: string;

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

  @Field(() => AddressSnapshotInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapshotInput)
  partnerAddress?: AddressSnapshotInput;

  @Field(() => String)
  @IsString()
  reason!: string;

  @Field(() => [DebitNoteItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DebitNoteItemInput)
  items!: DebitNoteItemInput[];
}
