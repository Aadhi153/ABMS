import { Field, Float, InputType } from "@nestjs/graphql";
import { IsDateString, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreateSupplierBillInput {
  @Field(() => String)
  @IsString()
  supplierId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @Field(() => Float)
  @Min(0.01)
  amount!: number;

  @Field(() => String)
  @IsDateString()
  dueDate!: string;
}
