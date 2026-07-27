import { Field, InputType } from "@nestjs/graphql";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { TaskStatus } from "@abms/shared";

@InputType()
export class CreateTaskInput {
  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  contactId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dealId?: string;
}

@InputType()
export class UpdateTaskInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  contactId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  dealId?: string;
}
