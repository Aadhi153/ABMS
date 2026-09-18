import { Field, Float, InputType } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString, Min } from "class-validator";
import { IncentiveType } from "@abms/database";

@InputType()
export class CreateIncentiveInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsEnum(IncentiveType)
  type!: IncentiveType;

  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => Float)
  @Min(0)
  amount!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field(() => Date)
  @IsDate()
  awardDate!: Date;
}

@InputType()
export class CreateManualIncentiveInput {
  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  employeeIds!: string[];

  @Field(() => Float)
  @Min(1)
  amount!: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  giveFullAmountToEach?: boolean;

  @Field(() => String)
  @IsString()
  reason!: string;
}
