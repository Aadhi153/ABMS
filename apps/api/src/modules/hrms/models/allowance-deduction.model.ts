import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AllowanceDeductionEntryModel {
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
  type!: string;

  @Field(() => Date)
  date!: Date;

  @Field(() => Float)
  amount!: number;

  @Field(() => String)
  paymentMode!: string;

  @Field(() => String, { nullable: true })
  remarks?: string | null;

  @Field(() => String, { nullable: true })
  createdById?: string | null;

  @Field(() => String, { nullable: true })
  createdByName?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class AllowanceDeductionSummaryModel {
  @Field(() => Float)
  totalAllowances!: number;

  @Field(() => Float)
  totalDeductions!: number;

  @Field(() => Float)
  netAdjustment!: number;

  @Field(() => Int)
  totalRecords!: number;
}
