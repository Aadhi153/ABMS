import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SalaryComponentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  calculationType!: string;

  @Field(() => Float)
  value!: number;

  @Field(() => String)
  percentageOf!: string;

  @Field(() => Boolean)
  taxable!: boolean;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Float)
  assignedEmployeeCount!: number;
}

@ObjectType()
export class EmployeeSalaryComponentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeId!: string;

  @Field(() => String)
  employeeName!: string;

  @Field(() => String)
  salaryComponentId!: string;

  @Field(() => String)
  salaryComponentName!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  calculationType!: string;

  @Field(() => Float, { nullable: true })
  amount?: number | null;

  @Field(() => Date)
  effectiveFrom!: Date;

  @Field(() => Date, { nullable: true })
  effectiveTo?: Date | null;

  @Field(() => Boolean)
  active!: boolean;
}
