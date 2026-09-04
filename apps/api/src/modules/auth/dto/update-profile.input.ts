import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsJSON, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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
  @MaxLength(280)
  bio?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  notifyEmailEnabled?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  notifyInAppEnabled?: boolean;

  /** JSON-encoded { [category]: { inApp: boolean; email: boolean } } — see NotificationsService for category keys. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsJSON()
  notificationCategoryPrefs?: string;
}
