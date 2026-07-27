import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LedgerEntryModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  type!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => String)
  description!: string;

  @Field(() => Date)
  postedAt!: Date;
}

@ObjectType()
export class AgingModel {
  @Field(() => Float)
  current!: number;

  @Field(() => Float)
  days31to60!: number;

  @Field(() => Float)
  days60plus!: number;
}

@ObjectType()
export class ReceivableModel {
  @Field(() => String)
  customerId!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Float)
  totalOwed!: number;

  @Field(() => AgingModel)
  aging!: AgingModel;

  @Field(() => Int)
  invoiceCount!: number;
}

@ObjectType()
export class PayableModel {
  @Field(() => String)
  supplierId!: string;

  @Field(() => String)
  supplierName!: string;

  @Field(() => Float)
  totalOwed!: number;

  @Field(() => AgingModel)
  aging!: AgingModel;

  @Field(() => Int)
  billCount!: number;
}

@ObjectType()
export class ExpenseModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  category!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => Date)
  date!: Date;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => String)
  createdByName!: string;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class PnlModel {
  @Field(() => Float)
  revenue!: number;

  @Field(() => Float)
  costOfGoods!: number;

  @Field(() => Float)
  operatingExpenses!: number;

  @Field(() => Float)
  netProfit!: number;
}
