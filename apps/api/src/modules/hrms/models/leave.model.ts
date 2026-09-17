import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LeaveTypeModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String)
  color!: string;

  @Field(() => Float)
  defaultDaysPerYear!: number;

  @Field(() => Float)
  maxCarryForwardDays!: number;

  @Field(() => String)
  accrualType!: string;

  @Field(() => Boolean)
  paid!: boolean;

  @Field(() => Boolean)
  isLOP!: boolean;

  @Field(() => Boolean)
  requiresApproval!: boolean;

  @Field(() => Boolean)
  encashable!: boolean;

  @Field(() => String, { nullable: true })
  applicableGender?: string | null;

  @Field(() => [String])
  restrictedDesignations!: string[];

  @Field(() => [String])
  restrictedEmployeeIds!: string[];

  @Field(() => Int)
  minServiceDays!: number;

  @Field(() => Int)
  minNoticeDays!: number;

  @Field(() => Int)
  maxConsecutiveDays!: number;

  @Field(() => Boolean)
  active!: boolean;
}

@ObjectType()
export class LeaveBalanceModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String, { nullable: true })
  department?: string | null;

  @Field(() => String)
  leaveTypeId!: string;

  @Field(() => String)
  leaveTypeName!: string;

  @Field(() => Int)
  year!: number;

  @Field(() => Float)
  allocatedDays!: number;

  @Field(() => Float)
  usedDays!: number;

  @Field(() => Float)
  carriedOverDays!: number;

  @Field(() => Float)
  remainingDays!: number;
}

@ObjectType()
export class LeaveRequestModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String, { nullable: true })
  employeeCode?: string | null;

  @Field(() => String, { nullable: true })
  department?: string | null;

  @Field(() => String)
  leaveTypeId!: string;

  @Field(() => String)
  leaveTypeName!: string;

  @Field(() => String, { nullable: true })
  leaveTypeCode?: string | null;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date)
  endDate!: Date;

  @Field(() => Boolean)
  halfDay!: boolean;

  @Field(() => Float)
  totalDays!: number;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  approvedById?: string | null;

  @Field(() => String, { nullable: true })
  approvedByName?: string | null;

  @Field(() => Date, { nullable: true })
  approvedAt?: Date | null;

  @Field(() => String, { nullable: true })
  rejectionReason?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class HolidayModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Date)
  date!: Date;

  @Field(() => String)
  type!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Boolean)
  paid!: boolean;
}

@ObjectType()
export class WeeklyOffModel {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  dayOfWeek!: number;
}
