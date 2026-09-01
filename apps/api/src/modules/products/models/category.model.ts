import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CategoryModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  color?: string | null;

  @Field(() => String, { nullable: true })
  parentId?: string | null;

  @Field(() => CategoryModel, { nullable: true })
  parent?: CategoryModel | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  sortOrder!: number;

  @Field(() => Int)
  productsCount!: number;

  @Field(() => Int)
  subcategoriesCount!: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
