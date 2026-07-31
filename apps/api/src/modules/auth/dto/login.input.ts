import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class LoginInput {
  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  password!: string;
}
