import { Field, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { StockMovementType } from "@abms/shared";
import { WarehouseModel } from "../../settings/models/warehouse.model";

registerEnumType(StockMovementType, { name: "StockMovementType" });

@ObjectType()
export class StockLedgerEntryModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  productId!: string;

  @Field(() => String, { nullable: true })
  productName?: string;

  @Field(() => WarehouseModel)
  warehouse!: WarehouseModel;

  @Field(() => StockMovementType)
  type!: StockMovementType;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String, { nullable: true })
  reason?: string | null;

  @Field(() => String)
  createdByName!: string;

  @Field(() => Date)
  createdAt!: Date;
}
