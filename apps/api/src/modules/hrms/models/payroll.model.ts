import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PayslipComponentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  type!: string;

  @Field(() => Float)
  amount!: number;
}

@ObjectType()
export class PayslipModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  payslipNumber!: string;

  @Field(() => String)
  payrollRunId!: string;

  @Field(() => Int)
  month!: number;

  @Field(() => Int)
  year!: number;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  employeeCode!: string;

  @Field(() => Float)
  grossEarnings!: number;

  @Field(() => Float)
  totalDeductions!: number;

  @Field(() => Float)
  netPay!: number;

  @Field(() => Float)
  daysPresent!: number;

  @Field(() => Float)
  daysOnLeave!: number;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  generatedAt!: Date;

  @Field(() => Date, { nullable: true })
  paidAt?: Date | null;

  @Field(() => [PayslipComponentModel])
  components!: PayslipComponentModel[];
}

@ObjectType()
export class PayrollRunModel {
  @Field(() => String)
  id!: string;

  @Field(() => Int)
  month!: number;

  @Field(() => Int)
  year!: number;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  totalGross!: number;

  @Field(() => Float)
  totalDeductions!: number;

  @Field(() => Float)
  totalNet!: number;

  @Field(() => String, { nullable: true })
  processedById?: string | null;

  @Field(() => String, { nullable: true })
  processedByName?: string | null;

  @Field(() => Date, { nullable: true })
  processedAt?: Date | null;

  @Field(() => Int)
  payslipCount!: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
