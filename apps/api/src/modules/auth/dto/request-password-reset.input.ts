import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEmail } from "class-validator";

@InputType()
export class RequestPasswordResetInput {
  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;
}
