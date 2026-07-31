import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsEmail, IsEnum } from "class-validator";
import { Role } from "@abms/shared";

@InputType()
export class InviteUserInput {
  @Field(() => String)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @Field(() => Role)
  @IsEnum(Role)
  role!: Role;
}
