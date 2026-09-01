import { Field, Float, InputType, Int } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { AddressType, BankAccountType, BusinessType, ContactMethodType } from "@abms/shared";

@InputType()
export class SupplierContactInput {
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
export class SupplierAddressInput {
  @Field(() => AddressType, { nullable: true })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @Field(() => String)
  @IsString()
  addressLine1!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @Field(() => String)
  @IsString()
  city!: string;

  @Field(() => String)
  @IsString()
  state!: string;

  @Field(() => String)
  @IsString()
  postalCode!: string;

  @Field(() => String)
  @IsString()
  country!: string;
}

@InputType()
export class SupplierBankAccountInput {
  @Field(() => String)
  @IsString()
  bankName!: string;

  @Field(() => String)
  @IsString()
  bankBranch!: string;

  @Field(() => String)
  @IsString()
  accountNumber!: string;

  @Field(() => String)
  @IsString()
  ifscCode!: string;

  @Field(() => BankAccountType, { nullable: true })
  @IsOptional()
  @IsEnum(BankAccountType)
  accountType?: BankAccountType;
}

@InputType()
export class CreateSupplierInput {
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTime?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  minOrderValue?: number;

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
  isAlsoCustomer?: boolean;

  @Field(() => [SupplierContactInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierContactInput)
  contacts?: SupplierContactInput[];

  @Field(() => [SupplierAddressInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierAddressInput)
  addresses?: SupplierAddressInput[];

  @Field(() => [SupplierBankAccountInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierBankAccountInput)
  bankAccounts?: SupplierBankAccountInput[];
}

@InputType()
export class UpdateSupplierInput {
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTime?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  minOrderValue?: number;

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
  isAlsoCustomer?: boolean;

  @Field(() => [SupplierContactInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierContactInput)
  contacts?: SupplierContactInput[];

  @Field(() => [SupplierAddressInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierAddressInput)
  addresses?: SupplierAddressInput[];

  @Field(() => [SupplierBankAccountInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierBankAccountInput)
  bankAccounts?: SupplierBankAccountInput[];
}
