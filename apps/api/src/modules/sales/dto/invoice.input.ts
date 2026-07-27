import { Field, Float, InputType } from "@nestjs/graphql";
import { IsEnum, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@abms/database";

@InputType()
export class RecordPaymentInput {
  @Field(() => String)
  @IsString()
  invoiceId!: string;

  @Field(() => Float)
  @Min(0.01)
  amount!: number;

  @Field(() => String)
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reference?: string;
}
