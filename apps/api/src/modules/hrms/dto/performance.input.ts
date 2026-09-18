import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsDate, IsOptional, IsString, Max, Min } from "class-validator";

@InputType()
export class CreatePerformanceReviewInput {
  @Field(() => String)
  @IsString()
  employeeId!: string;

  @Field(() => Date)
  @IsDate()
  reviewPeriodStart!: Date;

  @Field(() => Date)
  @IsDate()
  reviewPeriodEnd!: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(1)
  @Max(5)
  rating?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  @Max(5)
  selfScore?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  goals?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  achievements?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  areasOfImprovement?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  managerComments?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  employeeComments?: string;
}

@InputType()
export class GenerateAppraisalCycleInput {
  @Field(() => String)
  @IsString()
  period!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  employeeIds?: string[];
}
