import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Gender, LeaveAccrualType } from "@abms/database";

@InputType()
export class CreateLeaveTypeInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String)
  @IsString()
  code!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  color?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  defaultDaysPerYear?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  maxCarryForwardDays?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(LeaveAccrualType)
  accrualType?: LeaveAccrualType;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isLOP?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  encashable?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  applicableGender?: Gender | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictedDesignations?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictedEmployeeIds?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  minServiceDays?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  minNoticeDays?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  maxConsecutiveDays?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class CreateLeaveRequestInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsString()
  leaveTypeId!: string;

  @Field(() => Date)
  @IsDate()
  startDate!: Date;

  @Field(() => Date)
  @IsDate()
  endDate!: Date;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}

@InputType()
export class AdjustLeaveBalanceInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsString()
  leaveTypeId!: string;

  @Field(() => Int)
  @Min(2000)
  year!: number;

  @Field(() => Float)
  @Min(0)
  allocatedDays!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  carriedOverDays?: number;
}

@InputType()
export class BulkAllocateLeaveBalanceInput {
  @Field(() => String)
  @IsString()
  leaveTypeId!: string;

  @Field(() => Int)
  @Min(2000)
  year!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  overrideDays?: number;
}

@InputType()
export class LeaveRequestFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  leaveTypeId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  status?: string;
}

@InputType()
export class RecordLeaveEntryInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsString()
  leaveTypeId!: string;

  @Field(() => Date)
  @IsDate()
  startDate!: Date;

  @Field(() => Date)
  @IsDate()
  endDate!: Date;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}

@InputType()
export class CreateHolidayInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => Date)
  @IsDate()
  date!: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  type?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}

@InputType()
export class HolidayFilterInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  year?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  type?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}

@InputType()
export class SetWeeklyOffsInput {
  @Field(() => [Int])
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek!: number[];
}
