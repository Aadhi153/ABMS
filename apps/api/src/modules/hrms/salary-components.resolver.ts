import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { SalaryComponentsService } from "./salary-components.service";
import { EmployeeSalaryComponentModel, SalaryComponentModel } from "./models/salary-component.model";
import { AssignEmployeeSalaryComponentInput, CreateSalaryComponentInput } from "./dto/salary-component.input";

@Resolver(() => SalaryComponentModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SalaryComponentsResolver {
  constructor(
    private readonly salaryComponentsService: SalaryComponentsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [SalaryComponentModel])
  salaryComponents() {
    return this.salaryComponentsService.findAll();
  }

  @Query(() => SalaryComponentModel, { nullable: true })
  salaryComponent(@Args("id") id: string) {
    return this.salaryComponentsService.findById(id);
  }

  @Query(() => [EmployeeSalaryComponentModel])
  employeeSalaryComponents(@Args("employeeId") employeeId: string) {
    return this.salaryComponentsService.findEmployeeComponents(employeeId);
  }

  @Mutation(() => SalaryComponentModel)
  async createSalaryComponent(@Args("input") input: CreateSalaryComponentInput, @CurrentUser() actor: User) {
    const component = await this.salaryComponentsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "SalaryComponent", component.id, component);
    return component;
  }

  @Mutation(() => SalaryComponentModel)
  async updateSalaryComponent(@Args("id") id: string, @Args("input") input: CreateSalaryComponentInput, @CurrentUser() actor: User) {
    const before = await this.salaryComponentsService.findById(id);
    const component = await this.salaryComponentsService.update(id, input);
    await this.audit.logUpdate(actor, "SalaryComponent", id, before, component);
    return component;
  }

  @Mutation(() => Boolean)
  async deleteSalaryComponent(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.salaryComponentsService.delete(id);
    await this.audit.logDelete(actor, "SalaryComponent", id, deleted);
    return true;
  }

  @Mutation(() => EmployeeSalaryComponentModel)
  assignEmployeeSalaryComponent(@Args("input") input: AssignEmployeeSalaryComponentInput) {
    return this.salaryComponentsService.assign(input);
  }

  @Mutation(() => EmployeeSalaryComponentModel)
  updateEmployeeSalaryComponent(@Args("id") id: string, @Args("input") input: AssignEmployeeSalaryComponentInput) {
    return this.salaryComponentsService.updateAssignment(id, input);
  }

  @Mutation(() => Boolean)
  async removeEmployeeSalaryComponent(@Args("id") id: string) {
    await this.salaryComponentsService.removeAssignment(id);
    return true;
  }
}
