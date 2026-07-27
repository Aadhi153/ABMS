import { Field, ObjectType } from "@nestjs/graphql";
import { Role } from "@abms/shared";

/** Returned by the unauthenticated inviteInfo query so /invite/:token can
 * render "join {org} as {role}" or an expired-link message before any
 * password is set. */
@ObjectType()
export class InviteInfoModel {
  @Field(() => Boolean)
  valid!: boolean;

  @Field(() => Boolean)
  expired!: boolean;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String, { nullable: true })
  organizationName!: string | null;

  @Field(() => Role, { nullable: true })
  role!: Role | null;
}
