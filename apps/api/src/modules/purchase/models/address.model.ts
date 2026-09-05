import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AddressSnapshotModel {
  @Field(() => String, { nullable: true })
  line1?: string | null;

  @Field(() => String, { nullable: true })
  line2?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => String, { nullable: true })
  state?: string | null;

  @Field(() => String, { nullable: true })
  postalCode?: string | null;

  @Field(() => String, { nullable: true })
  country?: string | null;
}
