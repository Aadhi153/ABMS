import { Field, InputType, Int } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreateShiftInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field(() => String)
  @IsString()
  startTime!: string;

  @Field(() => String)
  @IsString()
  endTime!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  breakMinutes?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Min(0)
  gracePeriodMinutes?: number;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  workingDays!: string[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
