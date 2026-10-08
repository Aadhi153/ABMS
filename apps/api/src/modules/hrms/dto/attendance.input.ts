import { Field, InputType } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsBoolean, IsDate, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AttendanceStatus, BiometricTerminalStatus, VerifyMethod } from "@abms/database";

@InputType()
export class MarkAttendanceInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => Date)
  @IsDate()
  date!: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  checkIn?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  checkOut?: Date;

  @Field(() => String)
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shiftId?: string | null;
}

@InputType()
export class BulkAttendanceEntryInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  checkIn?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  checkOut?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class BulkMarkAttendanceInput {
  @Field(() => Date)
  @IsDate()
  date!: Date;

  @Field(() => [BulkAttendanceEntryInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceEntryInput)
  entries!: BulkAttendanceEntryInput[];
}

@InputType()
export class AttendanceFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  from?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  to?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  branchId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shiftId?: string;
}

@InputType()
export class SyncBiometricLogsInput {
  @Field(() => String)
  @IsString()
  branchId!: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  from?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  to?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

@InputType()
export class CreateBiometricTerminalInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  branchId?: string;

  @Field(() => [String])
  @IsArray()
  @IsEnum(VerifyMethod, { each: true })
  capabilities!: VerifyMethod[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(BiometricTerminalStatus)
  status?: BiometricTerminalStatus;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class UpdateBiometricTerminalInput extends CreateBiometricTerminalInput {}

@InputType()
export class AddAttendanceSessionInput {
  @Field(() => String)
  @IsString()
  attendanceLogId!: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  checkIn?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  checkOut?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  terminalId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(VerifyMethod)
  verifyMethod?: VerifyMethod;
}
