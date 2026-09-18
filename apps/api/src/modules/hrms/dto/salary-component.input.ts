import { Field, Float, InputType } from "@nestjs/graphql";
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, Min } from "class-validator";
import { CalculationType, SalaryComponentType } from "@abms/database";

@InputType()
export class CreateSalaryComponentInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String)
  @IsString()
  code!: string;

  @Field(() => String)
  @IsEnum(SalaryComponentType)
  type!: SalaryComponentType;

  @Field(() => String)
  @IsEnum(CalculationType)
  calculationType!: CalculationType;

  @Field(() => Float)
  @Min(0)
  value!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  percentageOf?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class AssignEmployeeSalaryComponentInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsString()
  salaryComponentId!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  amount?: number;

  @Field(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  effectiveTo?: Date;
}
