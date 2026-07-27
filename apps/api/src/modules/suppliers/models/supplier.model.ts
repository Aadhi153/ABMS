import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SupplierModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => String, { nullable: true })
  paymentTerms?: string | null;

  @Field(() => Int)
  orderCount!: number;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class SupplierPurchaseSummaryModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  poNumber!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  total!: number;

  @Field(() => Date)
  createdAt!: Date;
}
