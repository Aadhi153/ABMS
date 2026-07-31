import { Field, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@abms/shared";

@InputType()
export class CreateUserInput {
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
  name!: string;

  @Field(() => Role)
  @IsEnum(Role)
  role!: Role;
}

@InputType()
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Role, { nullable: true })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
