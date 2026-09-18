import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { PayrollService } from "./payroll.service";
import { PayrollRunModel, PayslipModel } from "./models/payroll.model";
import { CreatePayrollRunInput } from "./dto/payroll.input";

@Resolver(() => PayrollRunModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PayrollResolver {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [PayrollRunModel])
  payrollRuns() {
    return this.payrollService.findAllRuns();
  }

  @Query(() => PayrollRunModel, { nullable: true })
  payrollRun(@Args("id") id: string) {
    return this.payrollService.findRunById(id);
  }

  @Query(() => [PayslipModel])
  payslips(@Args("payrollRunId", { nullable: true }) payrollRunId?: string, @Args("employeeId", { nullable: true }) employeeId?: string) {
    return this.payrollService.findPayslips({ payrollRunId, employeeId });
  }

  @Query(() => PayslipModel, { nullable: true })
  payslip(@Args("id") id: string) {
    return this.payrollService.findPayslipById(id);
  }

  @Mutation(() => PayrollRunModel)
  async createPayrollRun(@Args("input") input: CreatePayrollRunInput, @CurrentUser() actor: User) {
    const run = await this.payrollService.createRun(input, actor.organizationId);
    await this.audit.logCreate(actor, "PayrollRun", run.id, run);
    return run;
  }

  @Mutation(() => PayrollRunModel)
  async processPayrollRun(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.payrollService.findRunById(id);
    const run = await this.payrollService.processRun(id, actor.organizationId);
    await this.audit.logUpdate(actor, "PayrollRun", id, before, run);
    return run;
  }

  @Mutation(() => PayrollRunModel)
  async approvePayrollRun(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.payrollService.findRunById(id);
    const run = await this.payrollService.approveRun(id, actor.id);
    await this.audit.logUpdate(actor, "PayrollRun", id, before, run);
    return run;
  }

  @Mutation(() => PayrollRunModel)
  async markPayrollRunPaid(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.payrollService.findRunById(id);
    const run = await this.payrollService.markPaid(id);
    await this.audit.logUpdate(actor, "PayrollRun", id, before, run);
    return run;
  }

  @Mutation(() => PayrollRunModel)
  async cancelPayrollRun(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.payrollService.findRunById(id);
    const run = await this.payrollService.cancelRun(id);
    await this.audit.logUpdate(actor, "PayrollRun", id, before, run);
    return run;
  }

  @Mutation(() => Boolean)
  async deletePayrollRun(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.payrollService.deleteRun(id);
    await this.audit.logDelete(actor, "PayrollRun", id, deleted);
    return true;
  }
}
