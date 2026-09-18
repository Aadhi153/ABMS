import { Field, Float, InputType } from "@nestjs/graphql";
import { ArrayMinSize, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class KpiTemplateTargetInput {
  @Field(() => Float)
  @Min(0)
  weightagePct!: number;

  @Field(() => String)
  @IsString()
  targetName!: string;

  @Field(() => String)
  @IsString()
  targetValueDefinition!: string;

  @Field(() => String)
  @IsString()
  incentiveName!: string;
}

@InputType()
export class CreateKpiTemplateInput {
  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  designation?: string;

  @Field(() => [KpiTemplateTargetInput])
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => KpiTemplateTargetInput)
  targets!: KpiTemplateTargetInput[];
}
