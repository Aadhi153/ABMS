import { Field, Float, InputType } from "@nestjs/graphql";
import { IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreatePerformanceGoalInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => String)
  @IsString()
  kpiTemplateId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  targetId?: string;

  @Field(() => String)
  @IsString()
  period!: string;

  @Field(() => Float)
  @Min(0)
  weightagePct!: number;
}
