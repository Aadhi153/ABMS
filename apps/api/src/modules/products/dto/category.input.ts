import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class CreateCategoryInput {
  @Field(() => String)
  @IsString()
  name!: string;
}

@InputType()
export class UpdateCategoryInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;
}
