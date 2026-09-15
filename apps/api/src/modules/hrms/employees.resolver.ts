import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { EmployeesService } from "./employees.service";
import { EmployeeModel, EmployeeDocumentModel } from "./models/employee.model";
import { AddEmployeeDocumentInput, CreateEmployeeInput, EmployeeFilterInput } from "./dto/employee.input";

@Resolver(() => EmployeeModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EmployeesResolver {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [EmployeeModel])
  employees(@Args("filter", { nullable: true }) filter?: EmployeeFilterInput) {
    return this.employeesService.findAll(filter);
  }

  @Query(() => EmployeeModel, { nullable: true })
  employee(@Args("id") id: string) {
    return this.employeesService.findById(id);
  }

  @Mutation(() => EmployeeModel)
  async createEmployee(@Args("input") input: CreateEmployeeInput, @CurrentUser() actor: User) {
    const employee = await this.employeesService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Employee", employee.id, employee);
    return employee;
  }

  @Mutation(() => EmployeeModel)
  async updateEmployee(@Args("id") id: string, @Args("input") input: CreateEmployeeInput, @CurrentUser() actor: User) {
    const before = await this.employeesService.findById(id);
    const employee = await this.employeesService.update(id, input);
    await this.audit.logUpdate(actor, "Employee", id, before, employee);
    return employee;
  }

  @Mutation(() => EmployeeModel)
  async updateEmployeeStatus(@Args("id") id: string, @Args("status") status: string, @CurrentUser() actor: User) {
    const before = await this.employeesService.findById(id);
    const employee = await this.employeesService.updateStatus(id, status);
    await this.audit.logUpdate(actor, "Employee", id, before, employee);
    return employee;
  }

  @Mutation(() => Boolean)
  async deleteEmployee(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.employeesService.delete(id);
    await this.audit.logDelete(actor, "Employee", id, deleted);
    return true;
  }

  @Query(() => [EmployeeDocumentModel])
  employeeDocuments(@Args("employeeId") employeeId: string) {
    return this.employeesService.employeeDocuments(employeeId);
  }

  @Query(() => String)
  employeeDocumentUrl(@Args("documentId") documentId: string) {
    return this.employeesService.employeeDocumentUrl(documentId);
  }

  @Mutation(() => EmployeeDocumentModel)
  async addEmployeeDocument(@Args("input") input: AddEmployeeDocumentInput, @CurrentUser() actor: User) {
    const document = await this.employeesService.addEmployeeDocument(input);
    await this.audit.logCreate(actor, "EmployeeDocument", document.id, document);
    return document;
  }

  @Mutation(() => Boolean)
  async deleteEmployeeDocument(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.employeesService.deleteEmployeeDocument(id);
    await this.audit.logDelete(actor, "EmployeeDocument", id, deleted);
    return true;
  }
}
