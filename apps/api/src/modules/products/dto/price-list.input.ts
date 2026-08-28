import { Field, Float, InputType } from "@nestjs/graphql";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreatePriceListInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@InputType()
export class UpdatePriceListInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@InputType()
export class UpsertPriceListItemInput {
  @Field(() => String)
  @IsString()
  priceListId!: string;

  @Field(() => String)
  @IsString()
  productId!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price!: number;
}
