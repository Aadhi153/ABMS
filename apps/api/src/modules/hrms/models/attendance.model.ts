import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AttendanceSessionModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  attendanceLogId!: string;

  @Field(() => Int)
  sessionIndex!: number;

  @Field(() => Date, { nullable: true })
  checkIn?: Date | null;

  @Field(() => Date, { nullable: true })
  checkOut?: Date | null;

  @Field(() => String, { nullable: true })
  terminalId?: string | null;

  @Field(() => String, { nullable: true })
  terminalName?: string | null;

  @Field(() => String, { nullable: true })
  verifyMethod?: string | null;
}

@ObjectType()
export class BiometricTerminalModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => String, { nullable: true })
  branchId?: string | null;

  @Field(() => String, { nullable: true })
  branchName?: string | null;

  @Field(() => [String])
  capabilities!: string[];

  @Field(() => String)
  status!: string;

  @Field(() => Date, { nullable: true })
  lastSeenAt?: Date | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class AttendanceLogModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  employeeCode!: string;

  @Field(() => String)
  department!: string;

  @Field(() => String)
  designation!: string;

  @Field(() => String, { nullable: true })
  branchId?: string | null;

  @Field(() => String, { nullable: true })
  branchName?: string | null;

  @Field(() => Date)
  date!: Date;

  @Field(() => Date, { nullable: true })
  checkIn?: Date | null;

  @Field(() => Date, { nullable: true })
  checkOut?: Date | null;

  @Field(() => String)
  status!: string;

  @Field(() => Float, { nullable: true })
  workedHours?: number | null;

  @Field(() => String, { nullable: true })
  shiftId?: string | null;

  @Field(() => String, { nullable: true })
  shiftName?: string | null;

  @Field(() => String, { nullable: true })
  shiftCode?: string | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => String, { nullable: true })
  markedById?: string | null;

  @Field(() => String, { nullable: true })
  markedByName?: string | null;

  @Field(() => String, { nullable: true })
  checkInTerminalName?: string | null;

  @Field(() => String, { nullable: true })
  checkInVerifyMethod?: string | null;

  @Field(() => String, { nullable: true })
  checkOutTerminalName?: string | null;

  @Field(() => String, { nullable: true })
  checkOutVerifyMethod?: string | null;

  @Field(() => [AttendanceSessionModel])
  sessions!: AttendanceSessionModel[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class AttendanceSummaryModel {
  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => Float)
  presentDays!: number;

  @Field(() => Float)
  absentDays!: number;

  @Field(() => Float)
  lateDays!: number;

  @Field(() => Float)
  halfDays!: number;

  @Field(() => Float)
  paidLeaveDays!: number;

  @Field(() => Float)
  lopDays!: number;

  @Field(() => Float)
  totalWorkedHours!: number;
}

@ObjectType()
export class BiometricSyncResultModel {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => Float)
  syncedCount!: number;

  @Field(() => String)
  message!: string;
}
