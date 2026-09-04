import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

@InputType()
export class UpdateProfileInput {
  @Field(() => String)
  @IsString()
  @MinLength(1)
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  notifyEmailEnabled?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  notifyInAppEnabled?: boolean;
}
