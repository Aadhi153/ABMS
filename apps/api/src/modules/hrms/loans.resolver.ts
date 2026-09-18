import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { LoansService } from "./loans.service";
import { EmployeeLoanModel } from "./models/loan.model";
import { CreateLoanInput } from "./dto/loan.input";

@Resolver(() => EmployeeLoanModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LoansResolver {
  constructor(
    private readonly loansService: LoansService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [EmployeeLoanModel])
  loans(@Args("employeeId", { nullable: true }) employeeId?: string, @Args("status", { nullable: true }) status?: string) {
    return this.loansService.findAll({ employeeId, status });
  }

  @Query(() => EmployeeLoanModel, { nullable: true })
  loan(@Args("id") id: string) {
    return this.loansService.findById(id);
  }

  @Mutation(() => EmployeeLoanModel)
  async createLoan(@Args("input") input: CreateLoanInput, @CurrentUser() actor: User) {
    const loan = await this.loansService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "EmployeeLoan", loan.id, loan);
    return loan;
  }

  @Mutation(() => EmployeeLoanModel)
  async approveLoan(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.loansService.findById(id);
    const loan = await this.loansService.approve(id, actor.id);
    await this.audit.logUpdate(actor, "EmployeeLoan", id, before, loan);
    return loan;
  }

  @Mutation(() => EmployeeLoanModel)
  async rejectLoan(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.loansService.findById(id);
    const loan = await this.loansService.reject(id, actor.id);
    await this.audit.logUpdate(actor, "EmployeeLoan", id, before, loan);
    return loan;
  }

  @Mutation(() => EmployeeLoanModel)
  async closeLoan(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.loansService.findById(id);
    const loan = await this.loansService.close(id);
    await this.audit.logUpdate(actor, "EmployeeLoan", id, before, loan);
    return loan;
  }

  @Mutation(() => EmployeeLoanModel)
  markRepaymentPaid(@Args("id") id: string) {
    return this.loansService.markRepaymentPaid(id);
  }

  @Mutation(() => Boolean)
  async deleteLoan(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.loansService.delete(id);
    await this.audit.logDelete(actor, "EmployeeLoan", id, deleted);
    return true;
  }
}
