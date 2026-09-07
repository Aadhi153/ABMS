import { Module } from "@nestjs/common";
import { EmployeesService } from "./employees.service";
import { EmployeesResolver } from "./employees.resolver";
import { OrgStructureService } from "./org-structure.service";
import { OrgStructureResolver } from "./org-structure.resolver";
import { ShiftsService } from "./shifts.service";
import { ShiftsResolver } from "./shifts.resolver";
import { AttendanceService } from "./attendance.service";
import { AttendanceResolver } from "./attendance.resolver";
import { LeaveService } from "./leave.service";
import { LeaveResolver } from "./leave.resolver";
import { SalaryComponentsService } from "./salary-components.service";
import { SalaryComponentsResolver } from "./salary-components.resolver";
import { SalaryRevisionsService } from "./salary-revisions.service";
import { SalaryRevisionsResolver } from "./salary-revisions.resolver";
import { LoansService } from "./loans.service";
import { LoansResolver } from "./loans.resolver";
import { PerformanceService } from "./performance.service";
import { PerformanceResolver } from "./performance.resolver";
import { IncentivesService } from "./incentives.service";
import { IncentivesResolver } from "./incentives.resolver";
import { PayrollService } from "./payroll.service";
import { PayrollResolver } from "./payroll.resolver";
import { OverviewService } from "./overview.service";
import { OverviewResolver } from "./overview.resolver";

@Module({
  providers: [
    EmployeesService,
    EmployeesResolver,
    OrgStructureService,
    OrgStructureResolver,
    ShiftsService,
    ShiftsResolver,
    AttendanceService,
    AttendanceResolver,
    LeaveService,
    LeaveResolver,
    SalaryComponentsService,
    SalaryComponentsResolver,
    SalaryRevisionsService,
    SalaryRevisionsResolver,
    LoansService,
    LoansResolver,
    PerformanceService,
    PerformanceResolver,
    IncentivesService,
    IncentivesResolver,
    PayrollService,
    PayrollResolver,
    OverviewService,
    OverviewResolver,
  ],
  exports: [
    EmployeesService,
    OrgStructureService,
    ShiftsService,
    AttendanceService,
    LeaveService,
    SalaryComponentsService,
    SalaryRevisionsService,
    LoansService,
    PerformanceService,
    IncentivesService,
    PayrollService,
    OverviewService,
  ],
})
export class HrmsModule {}
