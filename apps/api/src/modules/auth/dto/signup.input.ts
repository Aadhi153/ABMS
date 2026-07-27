import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class SignupInput {
  @Field(() => String)
  @IsString()
  @MinLength(1)
  fullName!: string;

  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => String)
  @IsString()
  @MinLength(8)
  password!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  organizationName!: string;
}
