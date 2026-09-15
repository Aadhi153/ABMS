import { Field, Float, InputType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsEmail, IsEnum, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { CalculationType, EmployeeDocumentCategory, EmployeeStatus, EmploymentType, Gender, MaritalStatus, PayMode } from "@abms/database";

@InputType()
export class EmployeeExperienceInput {
  @Field(() => String)
  @IsString()
  organizationName!: string;

  @Field(() => Date)
  @IsDate()
  startDate!: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  endDate?: Date;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  ctc?: number;
}

@InputType()
export class SalaryComponentAllocationInput {
  @Field(() => String)
  @IsString()
  code!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isMonthly?: boolean;
}

@InputType()
export class CreateEmployeeInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;

  @Field(() => String)
  @IsString()
  firstName!: string;

  @Field(() => String)
  @IsString()
  lastName!: string;

  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  dateOfBirth?: Date;

  @Field(() => Date)
  @IsDate()
  dateOfJoining!: Date;

  @Field(() => String)
  @IsString()
  designation!: string;

  @Field(() => String)
  @IsString()
  department!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reportingManagerId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  gradeId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  branchId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  biometricId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  workHoursPerDay?: string;

  @Field(() => Float)
  @Min(0)
  monthlyGrossSalary!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bankName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bankIfsc?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  panNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  aadharNumber?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(PayMode)
  payMode?: PayMode;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(CalculationType)
  tdsType?: CalculationType;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  tdsValue?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  uan?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  esiNumber?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  pfEligible?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  esiEligible?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  leaveWithPayEligible?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  dailyWagesEligible?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  temporaryAddress?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  fatherOrSpouseName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  qualification?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  religion?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @Field(() => [EmployeeExperienceInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeExperienceInput)
  experiences?: EmployeeExperienceInput[];

  @Field(() => [SalaryComponentAllocationInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentAllocationInput)
  salaryComponents?: SalaryComponentAllocationInput[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class EmployeeFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}

@InputType()
export class AddEmployeeDocumentInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  experienceId?: string;

  @Field(() => String)
  @IsEnum(EmployeeDocumentCategory)
  category!: EmployeeDocumentCategory;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  label?: string;

  @Field(() => String)
  @IsString()
  objectKey!: string;

  @Field(() => String)
  @IsString()
  fileName!: string;
}
