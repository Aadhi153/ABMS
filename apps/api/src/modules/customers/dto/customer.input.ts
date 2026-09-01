import { Field, Float, InputType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { BusinessType, ContactMethodType } from "@abms/shared";

@InputType()
export class CustomerContactInput {
  @Field(() => ContactMethodType)
  @IsEnum(ContactMethodType)
  type!: ContactMethodType;

  @Field(() => String)
  @IsString()
  value!: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

@InputType()
export class CreateCustomerInput {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => BusinessType, { nullable: true })
  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phoneCountryCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingPostalCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingAddressLine1?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingAddressLine2?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingCity?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingState?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingCountry?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingPostalCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingAddressLine1?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingAddressLine2?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingCity?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingState?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingCountry?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  creditLimit?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isAlsoSupplier?: boolean;

  @Field(() => [CustomerContactInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerContactInput)
  contacts?: CustomerContactInput[];
}

@InputType()
export class UpdateCustomerInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => BusinessType, { nullable: true })
  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phoneCountryCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  website?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingPostalCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingAddressLine1?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingAddressLine2?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingCity?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingState?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  billingCountry?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingPostalCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingAddressLine1?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingAddressLine2?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingCity?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingState?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  shippingCountry?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  creditLimit?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isAlsoSupplier?: boolean;

  @Field(() => [CustomerContactInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerContactInput)
  contacts?: CustomerContactInput[];
}
