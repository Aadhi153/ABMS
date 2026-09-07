import { Field, InputType } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsDate, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { AttendanceStatus } from "@abms/database";

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
}

@InputType()
export class BulkAttendanceEntryInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
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
}
