import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { LoanType } from "@abms/database";
import { IsDate, IsEnum, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreateLoanInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsEnum(LoanType)
  loanType!: LoanType;

  @Field(() => Float)
  @Min(1)
  principalAmount!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  interestRatePct?: number;

  @Field(() => Int)
  @Min(1)
  tenureMonths!: number;

  @Field(() => Date)
  @IsDate()
  startDate!: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}
