import { Field, Float, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { BusinessType, ContactMethodType } from "@abms/shared";

registerEnumType(BusinessType, { name: "BusinessType" });
registerEnumType(ContactMethodType, { name: "ContactMethodType" });

@ObjectType()
export class CustomerContactModel {
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
export class CustomerModel {
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

  @Field(() => String, { nullable: true })
  billingPostalCode?: string | null;

  @Field(() => String, { nullable: true })
  billingAddressLine1?: string | null;

  @Field(() => String, { nullable: true })
  billingAddressLine2?: string | null;

  @Field(() => String, { nullable: true })
  billingCity?: string | null;

  @Field(() => String, { nullable: true })
  billingState?: string | null;

  @Field(() => String, { nullable: true })
  billingCountry?: string | null;

  @Field(() => String, { nullable: true })
  shippingPostalCode?: string | null;

  @Field(() => String, { nullable: true })
  shippingAddressLine1?: string | null;

  @Field(() => String, { nullable: true })
  shippingAddressLine2?: string | null;

  @Field(() => String, { nullable: true })
  shippingCity?: string | null;

  @Field(() => String, { nullable: true })
  shippingState?: string | null;

  @Field(() => String, { nullable: true })
  shippingCountry?: string | null;

  @Field(() => Float, { nullable: true })
  creditLimit?: number | null;

  @Field(() => String, { nullable: true })
  paymentTerms?: string | null;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Boolean)
  isAlsoSupplier!: boolean;

  @Field(() => [CustomerContactModel])
  contacts!: CustomerContactModel[];

  @Field(() => Int)
  orderCount!: number;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class CustomerOrderSummaryModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  orderNumber!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  total!: number;

  @Field(() => Date)
  createdAt!: Date;
}
