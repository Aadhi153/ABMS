import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PerformanceGoalModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String, { nullable: true })
  branchId?: string | null;

  @Field(() => String, { nullable: true })
  branchName?: string | null;

  @Field(() => String)
  kpiTemplateId!: string;

  @Field(() => String)
  kpiTemplateTitle!: string;

  @Field(() => String, { nullable: true })
  targetId?: string | null;

  @Field(() => String, { nullable: true })
  targetName?: string | null;

  @Field(() => String)
  period!: string;

  @Field(() => Float)
  weightagePct!: number;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  assignedByName!: string;

  @Field(() => Date)
  createdAt!: Date;
}
