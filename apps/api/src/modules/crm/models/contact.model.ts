import { Field, ObjectType } from "@nestjs/graphql";
import { UserModel } from "../../users/models/user.model";

@ObjectType()
export class ContactModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => String, { nullable: true })
  source?: string | null;

  @Field(() => UserModel)
  owner!: UserModel;

  @Field(() => String, { nullable: true })
  companyId?: string | null;

  @Field(() => String, { nullable: true })
  companyName?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
