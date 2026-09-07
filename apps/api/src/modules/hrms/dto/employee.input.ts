import { Field, Float, InputType } from "@nestjs/graphql";
import { IsDate, IsEmail, IsEnum, IsOptional, IsString, Min } from "class-validator";
import { EmployeeStatus, EmploymentType, Gender } from "@abms/database";

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
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

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
