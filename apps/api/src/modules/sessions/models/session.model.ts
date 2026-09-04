import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SessionModel {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  userAgent!: string | null;

  @Field(() => String, { nullable: true })
  ipAddress!: string | null;

  @Field(() => String, { nullable: true })
  location!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  lastActiveAt!: Date;

  @Field(() => Date)
  expiresAt!: Date;

  @Field(() => Boolean)
  isCurrent!: boolean;
}
