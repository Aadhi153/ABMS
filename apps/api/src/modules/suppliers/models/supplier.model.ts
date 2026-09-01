import { Field, Float, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { AddressType, BankAccountType, BusinessType, ContactMethodType } from "@abms/shared";

registerEnumType(AddressType, { name: "AddressType" });
registerEnumType(BankAccountType, { name: "BankAccountType" });

@ObjectType()
export class SupplierContactModel {
  @Field(() => String)
  id!: string;

  @Field(() => ContactMethodType)
  type!: ContactMethodType;

  @Field(() => String)
  value!: string;

  @Field(() => Boolean)
  isPrimary!: boolean;
}

@ObjectType()
export class SupplierAddressModel {
  @Field(() => String)
  id!: string;

  @Field(() => AddressType)
  type!: AddressType;

  @Field(() => String)
  addressLine1!: string;

  @Field(() => String, { nullable: true })
  addressLine2?: string | null;

  @Field(() => String)
  city!: string;

  @Field(() => String)
  state!: string;

  @Field(() => String)
  postalCode!: string;

  @Field(() => String)
  country!: string;
}

@ObjectType()
export class SupplierBankAccountModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  bankName!: string;

  @Field(() => String)
  bankBranch!: string;

  @Field(() => String)
  accountNumber!: string;

  @Field(() => String)
  ifscCode!: string;

  @Field(() => BankAccountType)
  accountType!: BankAccountType;
}

@ObjectType()
export class SupplierModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => BusinessType)
  type!: BusinessType;

  @Field(() => String, { nullable: true })
  contactPerson?: string | null;

  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field(() => String, { nullable: true })
  phoneCountryCode?: string | null;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => String, { nullable: true })
  website?: string | null;

  @Field(() => String, { nullable: true })
  taxId?: string | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => Int, { nullable: true })
  leadTime?: number | null;

  @Field(() => Float, { nullable: true })
  minOrderValue?: number | null;

  @Field(() => Float, { nullable: true })
  creditLimit?: number | null;

  @Field(() => String, { nullable: true })
  paymentTerms?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Boolean)
  isAlsoCustomer!: boolean;

  @Field(() => [SupplierContactModel])
  contacts!: SupplierContactModel[];

  @Field(() => [SupplierAddressModel])
  addresses!: SupplierAddressModel[];

  @Field(() => [SupplierBankAccountModel])
  bankAccounts!: SupplierBankAccountModel[];

  @Field(() => Int)
  orderCount!: number;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class SupplierPurchaseSummaryModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  poNumber!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  total!: number;

  @Field(() => Date)
  createdAt!: Date;
}
