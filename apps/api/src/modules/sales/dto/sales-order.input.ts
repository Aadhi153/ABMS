import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class SalesOrderItemInput {
  @Field(() => String)
  @IsString()
  productId!: string;

  @Field(() => Int)
  @Min(1)
  quantity!: number;

  @Field(() => Float)
  @Min(0)
  unitPrice!: number;
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

  @Field(() => [SalesOrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemInput)
  items!: SalesOrderItemInput[];
}
