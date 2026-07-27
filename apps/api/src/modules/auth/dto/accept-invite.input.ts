import { Field, InputType } from "@nestjs/graphql";
import { IsString, MinLength } from "class-validator";

@InputType()
export class AcceptInviteInput {
  @Field(() => String)
  @IsString()
  token!: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  name!: string;

  @Field(() => String)
  @IsString()
  @MinLength(8)
  password!: string;
}
