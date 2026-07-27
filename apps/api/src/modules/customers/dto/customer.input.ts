import { Field, Float, InputType } from "@nestjs/graphql";
import { IsEmail, IsOptional, IsString, Min } from "class-validator";

@InputType()
export class CreateCustomerInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  creditLimit?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}

@InputType()
export class UpdateCustomerInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  creditLimit?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}
