import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class IncentiveMatrixRuleModel {
  @Field(() => String)
  id!: string;

  @Field(() => Float)
  minScore!: number;

  @Field(() => Float)
  maxScore!: number;

  @Field(() => Float)
  bonusAmount!: number;

  @Field(() => Float, { nullable: true })
  incrementPct?: number | null;

  @Field(() => Date)
  createdAt!: Date;
}
