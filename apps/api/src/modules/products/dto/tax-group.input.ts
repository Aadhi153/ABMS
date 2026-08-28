import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsOptional, IsString } from "class-validator";

@InputType()
export class CreateTaxGroupInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  taxRateIds!: string[];
}

@InputType()
export class UpdateTaxGroupInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taxRateIds?: string[];
}
