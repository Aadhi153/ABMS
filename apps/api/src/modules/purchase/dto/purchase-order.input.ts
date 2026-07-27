import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class PurchaseOrderItemInput {
  @Field(() => String)
  @IsString()
  productId!: string;

  @Field(() => Int)
  @Min(1)
  quantity!: number;

  @Field(() => Float)
  @Min(0)
  unitCost!: number;
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

  @Field(() => [PurchaseOrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInput)
  items!: PurchaseOrderItemInput[];
}
