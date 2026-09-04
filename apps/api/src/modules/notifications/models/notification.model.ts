import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { NotificationType } from "@abms/shared";

registerEnumType(NotificationType, { name: "NotificationType" });

@ObjectType()
export class NotificationModel {
  @Field(() => String)
  id!: string;

  @Field(() => NotificationType)
  type!: NotificationType;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  message!: string;

  @Field(() => Boolean)
  isRead!: boolean;

  @Field(() => String, { nullable: true })
  link!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
