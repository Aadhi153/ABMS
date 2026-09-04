import { Field, InputType } from "@nestjs/graphql";
import { IsString, MinLength } from "class-validator";

@InputType()
export class ChangePasswordInput {
  @Field(() => String)
  @IsString()
  currentPassword!: string;

  @Field(() => String)
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
