import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class BrandModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  code!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  websiteUrl!: string | null;

  @Field(() => String, { nullable: true })
  logoUrl!: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  productsCount!: number;

  @Field(() => Date)
  createdAt!: Date;
}
