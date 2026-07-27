import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { TaskStatus } from "@abms/shared";
import { UserModel } from "../../users/models/user.model";

registerEnumType(TaskStatus, { name: "TaskStatus" });

@ObjectType()
export class TaskModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => Date, { nullable: true })
  dueDate?: Date | null;

  @Field(() => TaskStatus)
  status!: TaskStatus;

  @Field(() => UserModel)
  assignee!: UserModel;

  @Field(() => String, { nullable: true })
  contactId?: string | null;

  @Field(() => String, { nullable: true })
  contactName?: string | null;

  @Field(() => String, { nullable: true })
  dealId?: string | null;

  @Field(() => String, { nullable: true })
  dealTitle?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
