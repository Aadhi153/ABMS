import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SalaryRevisionModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String, { nullable: true })
  employeeCode?: string | null;

  @Field(() => String, { nullable: true })
  employeeDepartment?: string | null;

  @Field(() => String)
  revisionType!: string;

  @Field(() => String, { nullable: true })
  previousDesignation?: string | null;

  @Field(() => String, { nullable: true })
  newDesignation?: string | null;

  @Field(() => String, { nullable: true })
  previousGradeName?: string | null;

  @Field(() => String, { nullable: true })
  newGradeName?: string | null;

  @Field(() => Float)
  previousSalary!: number;

  @Field(() => Float)
  newSalary!: number;

  @Field(() => Float, { nullable: true })
  incrementPct?: number | null;

  @Field(() => Date)
  effectiveDate!: Date;

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

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType()
export class PromotionRecommendationModel {
  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeCode!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  currentDesignation!: string;

  @Field(() => String)
  nextDesignation!: string;

  @Field(() => Int)
  tenureMonths!: number;

  @Field(() => Int)
  tenureRequiredMonths!: number;

  @Field(() => Float)
  currentPay!: number;

  @Field(() => Float)
  proposedMinBasic!: number;

  @Field(() => Boolean)
  eligible!: boolean;

  @Field(() => String, { nullable: true })
  reason?: string | null;
}

@ObjectType()
export class SalaryIncrementRowModel {
  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeCode!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  department!: string;

  @Field(() => Float)
  currentBasic!: number;

  @Field(() => Float)
  currentDA!: number;

  @Field(() => Float)
  currentHRA!: number;

  @Field(() => Float)
  currentOtherAllowance!: number;
}
