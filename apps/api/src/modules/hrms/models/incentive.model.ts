import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class IncentiveModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  source!: string;

  @Field(() => String, { nullable: true })
  appraisalId?: string | null;

  @Field(() => String, { nullable: true })
  appraisalPeriod?: string | null;

  @Field(() => Float, { nullable: true })
  finalScore?: number | null;

  @Field(() => String)
  title!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => Date)
  awardDate!: Date;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  approvedById?: string | null;

  @Field(() => String, { nullable: true })
  approvedByName?: string | null;

  @Field(() => Date, { nullable: true })
  approvedAt?: Date | null;

  @Field(() => String, { nullable: true })
  payslipId?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
