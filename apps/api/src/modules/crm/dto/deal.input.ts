import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { DealStage } from "@abms/shared";

@InputType()
export class CreateDealInput {
  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  value!: number;

  @Field(() => DealStage, { nullable: true })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  contactId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  companyId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ownerId?: string;
}

@InputType()
export class UpdateDealInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @Field(() => DealStage, { nullable: true })
  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  contactId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  companyId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ownerId?: string;
}
