import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ShiftModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => String)
  startTime!: string;

  @Field(() => String)
  endTime!: string;

  @Field(() => Int)
  breakMinutes!: number;

  @Field(() => Int)
  gracePeriodMinutes!: number;

  @Field(() => [String])
  workingDays!: string[];

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  employeeCount!: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
