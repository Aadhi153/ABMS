import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PaymentModel {
  @Field(() => String)
  id!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => String)
  method!: string;

  @Field(() => String, { nullable: true })
  reference?: string | null;

  @Field(() => Date)
  paidAt!: Date;
}

@ObjectType()
export class InvoiceModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  invoiceNumber!: string;

  @Field(() => String, { nullable: true })
  salesOrderId?: string | null;

  @Field(() => String, { nullable: true })
  orderNumber?: string | null;

  @Field(() => String)
  customerId!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  subtotal!: number;

  @Field(() => Float)
  taxAmount!: number;

  @Field(() => Float)
  discountAmount!: number;

  @Field(() => Float)
  total!: number;

  @Field(() => Float)
  amountPaid!: number;

  @Field(() => Date)
  dueDate!: Date;

  @Field(() => [PaymentModel])
  payments!: PaymentModel[];

  @Field(() => Date)
  createdAt!: Date;
}
