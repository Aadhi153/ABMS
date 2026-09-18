import { Field, Float, InputType } from "@nestjs/graphql";
import { IsOptional, Min } from "class-validator";

@InputType()
export class CreateIncentiveMatrixRuleInput {
  @Field(() => Float)
  @Min(0)
  minScore!: number;

  @Field(() => Float)
  @Min(0)
  maxScore!: number;

  @Field(() => Float)
  @Min(0)
  bonusAmount!: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  incrementPct?: number;
}
