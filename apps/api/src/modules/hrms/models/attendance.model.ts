import { Field, Float, ObjectType } from "@nestjs/graphql";

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
  notes?: string | null;

  @Field(() => String, { nullable: true })
  markedById?: string | null;

  @Field(() => String, { nullable: true })
  markedByName?: string | null;

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
  onLeaveDays!: number;

  @Field(() => Float)
  totalWorkedHours!: number;
}
