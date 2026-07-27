import { Field, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class GrnItemInput {
  @Field(() => String)
  @IsString()
  purchaseOrderItemId!: string;

  @Field(() => Int)
  @Min(1)
  quantityReceived!: number;
}

@InputType()
export class CreateGrnInput {
  @Field(() => String)
  @IsString()
  purchaseOrderId!: string;

  @Field(() => String)
  @IsString()
  warehouseId!: string;

  @Field(() => [GrnItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrnItemInput)
  items!: GrnItemInput[];
}
