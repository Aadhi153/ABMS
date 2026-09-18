import { Field, Float, Int, InputType } from "@nestjs/graphql";
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { AllowanceDeductionType, PayMode } from "@abms/database";

@InputType()
export class CreateAllowanceDeductionInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsEnum(AllowanceDeductionType)
  type!: AllowanceDeductionType;

  @Field(() => Date)
  @IsDate()
  date!: Date;

  @Field(() => Float)
  @Min(0)
  amount!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(PayMode)
  paymentMode?: PayMode;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  remarks?: string;
}

@InputType()
export class AllowanceDeductionFilterInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  month?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  year?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(AllowanceDeductionType)
  type?: AllowanceDeductionType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  employeeId?: string;
}
