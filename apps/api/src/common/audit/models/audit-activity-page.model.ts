import { Field, ObjectType } from "@nestjs/graphql";
import { AuditLogModel } from "./audit-log.model";

@ObjectType()
export class AuditActivityPageModel {
  @Field(() => [AuditLogModel])
  items!: AuditLogModel[];

  @Field(() => Boolean)
  hasMore!: boolean;
}
