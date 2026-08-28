import { Field, InputType, Int } from "@nestjs/graphql";
import { IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { StockMovementType } from "@abms/shared";

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

@InputType()
export class TransferStockInput {
  @Field(() => String)
  @IsString()
  productId!: string;

  @Field(() => String)
  @IsString()
  fromWarehouseId!: string;

  @Field(() => String)
  @IsString()
  toWarehouseId!: string;

  @Field(() => Int)
  @IsInt()
  quantity!: number;

  @Field(() => String)
  @IsString()
  reason!: string;
}

@InputType()
export class StockMovementFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  productId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @Field(() => StockMovementType, { nullable: true })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;
}
