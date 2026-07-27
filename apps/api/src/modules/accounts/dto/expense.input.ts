import { Field, Float, InputType } from "@nestjs/graphql";
import { IsDateString, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreateExpenseInput {
  @Field(() => String)
  @IsString()
  category!: string;

  @Field(() => Float)
  @Min(0.01)
  amount!: number;

  @Field(() => String)
  @IsDateString()
  date!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}
