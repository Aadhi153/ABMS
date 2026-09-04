import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Role } from "@abms/shared";

registerEnumType(Role, { name: "GlobalRole" });

@ObjectType()
export class UserModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Role)
  role!: Role;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => String, { nullable: true })
  jobTitle!: string | null;

  @Field(() => String, { nullable: true })
  bio!: string | null;

  @Field(() => Boolean)
  notifyEmailEnabled!: boolean;

  @Field(() => Boolean)
  notifyInAppEnabled!: boolean;

  /** JSON-encoded — see NotificationsService for category keys. Resolved by UserFieldsResolver. */
  @Field(() => String, { nullable: true })
  notificationCategoryPrefs!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
