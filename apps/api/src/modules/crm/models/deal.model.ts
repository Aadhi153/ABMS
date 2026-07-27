import { Field, Float, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { DealStage } from "@abms/shared";
import { UserModel } from "../../users/models/user.model";

registerEnumType(DealStage, { name: "DealStage" });

@ObjectType()
export class DealModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => Float)
  value!: number;

  @Field(() => DealStage)
  stage!: DealStage;

  @Field(() => Int)
  probability!: number;

  @Field(() => Date, { nullable: true })
  expectedCloseDate?: Date | null;

  @Field(() => String, { nullable: true })
  contactId?: string | null;

  @Field(() => String, { nullable: true })
  contactName?: string | null;

  @Field(() => String, { nullable: true })
  companyId?: string | null;

  @Field(() => String, { nullable: true })
  companyName?: string | null;

  @Field(() => UserModel)
  owner!: UserModel;

  @Field(() => Date)
  createdAt!: Date;
}
