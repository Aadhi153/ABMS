import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CategoryModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Date)
  createdAt!: Date;
}
