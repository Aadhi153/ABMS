import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SupplierBillModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  billNumber!: string;

  @Field(() => String)
  supplierId!: string;

  @Field(() => String)
  supplierName!: string;

  @Field(() => String, { nullable: true })
  purchaseOrderId?: string | null;

  @Field(() => String, { nullable: true })
  poNumber?: string | null;

  @Field(() => Float)
  amount!: number;

  @Field(() => String)
  status!: string;

  @Field(() => Date)
  dueDate!: Date;

  @Field(() => Date)
  createdAt!: Date;
}
