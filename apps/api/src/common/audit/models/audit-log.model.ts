import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { AuditAction } from "@abms/shared";

registerEnumType(AuditAction, { name: "AuditAction" });

@ObjectType()
export class AuditLogModel {
  @Field(() => String)
  id!: string;

  @Field(() => AuditAction)
  action!: AuditAction;

  @Field(() => String)
  entityType!: string;

  @Field(() => String)
  entityId!: string;

  @Field(() => String, { nullable: true })
  before!: string | null;

  @Field(() => String, { nullable: true })
  after!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
