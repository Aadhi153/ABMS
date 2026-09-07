import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class EmployeeModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  employeeCode!: string;

  @Field(() => String, { nullable: true })
  userId?: string | null;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => String)
  fullName!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  phone?: string | null;

  @Field(() => String, { nullable: true })
  gender?: string | null;

  @Field(() => Date, { nullable: true })
  dateOfBirth?: Date | null;

  @Field(() => Date)
  dateOfJoining!: Date;

  @Field(() => Date, { nullable: true })
  dateOfExit?: Date | null;

  @Field(() => String)
  designation!: string;

  @Field(() => String)
  department!: string;

  @Field(() => String)
  employmentType!: string;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  reportingManagerId?: string | null;

  @Field(() => String, { nullable: true })
  reportingManagerName?: string | null;

  @Field(() => String, { nullable: true })
  shiftId?: string | null;

  @Field(() => String, { nullable: true })
  shiftName?: string | null;

  @Field(() => String, { nullable: true })
  gradeId?: string | null;

  @Field(() => String, { nullable: true })
  gradeName?: string | null;

  @Field(() => Float)
  monthlyGrossSalary!: number;

  @Field(() => String, { nullable: true })
  bankAccountNumber?: string | null;

  @Field(() => String, { nullable: true })
  bankName?: string | null;

  @Field(() => String, { nullable: true })
  bankIfsc?: string | null;

  @Field(() => String, { nullable: true })
  panNumber?: string | null;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => String, { nullable: true })
  emergencyContactName?: string | null;

  @Field(() => String, { nullable: true })
  emergencyContactPhone?: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
