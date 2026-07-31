import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class SignupInput {
  @Field(() => String)
  @IsString()
  @MinLength(1)
  fullName!: string;

  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
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
