import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CompanyModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => String, { nullable: true })
  website?: string | null;

  @Field(() => Int)
  contactCount!: number;

  @Field(() => Int)
  dealCount!: number;

  @Field(() => Date)
  createdAt!: Date;
}
