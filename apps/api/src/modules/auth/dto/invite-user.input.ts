import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsEnum } from "class-validator";
import { Role } from "@abms/shared";

@InputType()
export class InviteUserInput {
  @Field(() => String)
  @IsEmail()
  email!: string;

  @Field(() => Role)
  @IsEnum(Role)
  role!: Role;
}
