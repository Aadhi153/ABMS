import { Field, ObjectType } from "@nestjs/graphql";
import { Role } from "@abms/shared";

@ObjectType()
export class InviteTokenModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  email!: string;

  @Field(() => Role)
  role!: Role;

  @Field(() => Date)
  expiresAt!: Date;

  @Field(() => Date, { nullable: true })
  acceptedAt!: Date | null;

  @Field(() => Date, { nullable: true })
  revokedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;
}
