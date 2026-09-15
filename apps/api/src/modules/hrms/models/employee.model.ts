import { Field, Float, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class EmployeeExperienceModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  organizationName!: string;

  @Field(() => Date)
  startDate!: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date | null;

  @Field(() => Float, { nullable: true })
  ctc?: number | null;
}

@ObjectType()
export class EmployeeDocumentModel {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  experienceId?: string | null;

  @Field(() => String)
  category!: string;

  @Field(() => String, { nullable: true })
  label?: string | null;

  @Field(() => String)
  fileName!: string;

  @Field(() => Date)
  createdAt!: Date;
}

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

  @Field(() => String, { nullable: true })
  branchId?: string | null;

  @Field(() => String, { nullable: true })
  branchName?: string | null;

  @Field(() => String, { nullable: true })
  biometricId?: string | null;

  @Field(() => String, { nullable: true })
  bloodGroup?: string | null;

  @Field(() => String, { nullable: true })
  maritalStatus?: string | null;

  @Field(() => String, { nullable: true })
  workHoursPerDay?: string | null;

  @Field(() => String, { nullable: true })
  fatherOrSpouseName?: string | null;

  @Field(() => String, { nullable: true })
  qualification?: string | null;

  @Field(() => String, { nullable: true })
  religion?: string | null;

  @Field(() => String, { nullable: true })
  temporaryAddress?: string | null;

  @Field(() => String, { nullable: true })
  aadharNumber?: string | null;

  @Field(() => Boolean)
  pfEligible!: boolean;

  @Field(() => Boolean)
  esiEligible!: boolean;

  @Field(() => Boolean)
  leaveWithPayEligible!: boolean;

  @Field(() => Boolean)
  dailyWagesEligible!: boolean;

  @Field(() => String, { nullable: true })
  uan?: string | null;

  @Field(() => String, { nullable: true })
  esiNumber?: string | null;

  @Field(() => String)
  payMode!: string;

  @Field(() => String)
  tdsType!: string;

  @Field(() => Float)
  tdsValue!: number;

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

  @Field(() => [EmployeeExperienceModel])
  experiences!: EmployeeExperienceModel[];

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => String, { nullable: true })
  notes?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
