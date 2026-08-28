import { Field, Int, ObjectType } from "@nestjs/graphql";
import { WarehouseModel } from "../../settings/models/warehouse.model";

@ObjectType()
export class StockTransferModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String, { nullable: true })
  productName?: string;

  @Field(() => WarehouseModel)
  fromWarehouse!: WarehouseModel;

  @Field(() => WarehouseModel)
  toWarehouse!: WarehouseModel;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => String)
  createdByName!: string;

  @Field(() => Date)
  createdAt!: Date;
}
