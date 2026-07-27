import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class WarehouseModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}
