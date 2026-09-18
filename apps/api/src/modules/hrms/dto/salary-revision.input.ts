import { Field, Float, InputType } from "@nestjs/graphql";
import { IsArray, IsDate, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class CreateSalaryRevisionInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  newDesignation?: string;

  @Field(() => Float)
  @Min(0)
  newSalary!: number;

  @Field(() => Date)
  @IsDate()
  effectiveDate!: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}

@InputType()
export class SalaryIncrementRowInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => Float)
  @Min(0)
  newBasic!: number;

  @Field(() => Float)
  @Min(0)
  newDA!: number;

  @Field(() => Float)
  @Min(0)
  newHRA!: number;

  @Field(() => Float)
  @Min(0)
  newOtherAllowance!: number;
}

@InputType()
export class SaveSalaryIncrementsInput {
  @Field(() => Date)
  @IsDate()
  effectiveDate!: Date;

  @Field(() => [SalaryIncrementRowInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryIncrementRowInput)
  rows!: SalaryIncrementRowInput[];
}
