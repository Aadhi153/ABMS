import { Field, InputType, Int } from "@nestjs/graphql";
import { Min } from "class-validator";

@InputType()
export class CreatePayrollRunInput {
  @Field(() => Int)
  @Min(1)
  month!: number;

  @Field(() => Int)
  @Min(2000)
  year!: number;
}
