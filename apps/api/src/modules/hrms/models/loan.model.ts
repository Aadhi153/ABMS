import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LoanRepaymentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  loanId!: string;

  @Field(() => Int)
  installmentNumber!: number;

  @Field(() => Date)
  dueDate!: Date;

  @Field(() => Float)
  amount!: number;

  @Field(() => String)
  status!: string;

  @Field(() => Date, { nullable: true })
  paidAt?: Date | null;

  @Field(() => String, { nullable: true })
  payslipId?: string | null;
}

@ObjectType()
export class EmployeeLoanModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  loanNumber!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  loanType!: string;

  @Field(() => Float)
  principalAmount!: number;

  @Field(() => Float)
  interestRatePct!: number;

  @Field(() => Int)
  tenureMonths!: number;

  @Field(() => Float)
  emiAmount!: number;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => String, { nullable: true })
  approvedById?: string | null;

  @Field(() => String, { nullable: true })
  approvedByName?: string | null;

  @Field(() => Date, { nullable: true })
  approvedAt?: Date | null;

  @Field(() => Float)
  outstandingAmount!: number;

  @Field(() => [LoanRepaymentModel])
  repayments!: LoanRepaymentModel[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
