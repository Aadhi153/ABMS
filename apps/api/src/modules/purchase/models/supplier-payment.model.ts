import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SupplierPaymentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  billId!: string;

  @Field(() => String)
  billNumber!: string;

  @Field(() => String)
  supplierId!: string;

  @Field(() => String)
  supplierName!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => String)
  method!: string;

  @Field(() => String, { nullable: true })
  reference?: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  requestedById!: string;

  @Field(() => String)
  requestedByName!: string;

  @Field(() => String, { nullable: true })
  approvedById?: string | null;

  @Field(() => String, { nullable: true })
  approvedByName?: string | null;

  @Field(() => Date)
  paidAt!: Date;

  @Field(() => Date, { nullable: true })
  resolvedAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;
}
