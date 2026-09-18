import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PerformanceReviewModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  reviewerId!: string;

  @Field(() => String)
  reviewerName!: string;

  @Field(() => Date)
  reviewPeriodStart!: Date;

  @Field(() => Date)
  reviewPeriodEnd!: Date;

  @Field(() => String)
  period!: string;

  @Field(() => Int, { nullable: true })
  rating?: number | null;

  @Field(() => Float, { nullable: true })
  selfScore?: number | null;

  @Field(() => String, { nullable: true })
  goals?: string | null;

  @Field(() => String, { nullable: true })
  achievements?: string | null;

  @Field(() => String, { nullable: true })
  areasOfImprovement?: string | null;

  @Field(() => String, { nullable: true })
  managerComments?: string | null;

  @Field(() => String, { nullable: true })
  employeeComments?: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => Date, { nullable: true })
  submittedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  acknowledgedAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
