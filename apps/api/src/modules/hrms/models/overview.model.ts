import { Field, Int, ObjectType } from "@nestjs/graphql";
import { EmployeeModel } from "./employee.model";
import { PayrollRunModel } from "./payroll.model";

@ObjectType()
export class DepartmentHeadcountModel {
  @Field(() => String)
  department!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class HrmsOverviewModel {
  @Field(() => Int)
  totalEmployees!: number;

  @Field(() => Int)
  activeEmployees!: number;

  @Field(() => Int)
  onLeaveToday!: number;

  @Field(() => Int)
  presentToday!: number;

  @Field(() => Int)
  absentToday!: number;

  @Field(() => Int)
  pendingLeaveRequests!: number;

  @Field(() => Int)
  pendingLoanApprovals!: number;

  @Field(() => Int)
  pendingSalaryRevisions!: number;

  @Field(() => Int)
  pendingIncentiveApprovals!: number;

  @Field(() => PayrollRunModel, { nullable: true })
  upcomingPayrollRun?: PayrollRunModel | null;

  @Field(() => [DepartmentHeadcountModel])
  headcountByDepartment!: DepartmentHeadcountModel[];

  @Field(() => [EmployeeModel])
  recentJoiners!: EmployeeModel[];

  @Field(() => [PayrollRunModel])
  recentPayrollRuns!: PayrollRunModel[];
}
