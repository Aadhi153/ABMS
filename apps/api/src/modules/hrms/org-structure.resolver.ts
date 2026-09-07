import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { OrgStructureService } from "./org-structure.service";
import { DepartmentModel, DesignationModel, GradeModel } from "./models/org-structure.model";
import { CreateDepartmentInput, CreateDesignationInput, CreateGradeInput } from "./dto/org-structure.input";

@Resolver(() => DepartmentModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class OrgStructureResolver {
  constructor(
    private readonly orgStructureService: OrgStructureService,
    private readonly audit: AuditService,
  ) {}

  // --- Departments ---

  @Query(() => [DepartmentModel])
  departments() {
    return this.orgStructureService.findDepartments();
  }

  @Mutation(() => DepartmentModel)
  async createDepartment(@Args("input") input: CreateDepartmentInput, @CurrentUser() actor: User) {
    const department = await this.orgStructureService.createDepartment(input, actor.organizationId);
    await this.audit.logCreate(actor, "Department", department.id, department);
    return department;
  }

  @Mutation(() => DepartmentModel)
  async updateDepartment(@Args("id") id: string, @Args("input") input: CreateDepartmentInput, @CurrentUser() actor: User) {
    const department = await this.orgStructureService.updateDepartment(id, input);
    await this.audit.logUpdate(actor, "Department", id, null, department);
    return department;
  }

  @Mutation(() => Boolean)
  async deleteDepartment(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.orgStructureService.deleteDepartment(id);
    await this.audit.logDelete(actor, "Department", id, deleted);
    return true;
  }

  // --- Designations ---

  @Query(() => [DesignationModel])
  designations() {
    return this.orgStructureService.findDesignations();
  }

  @Mutation(() => DesignationModel)
  async createDesignation(@Args("input") input: CreateDesignationInput, @CurrentUser() actor: User) {
    const designation = await this.orgStructureService.createDesignation(input, actor.organizationId);
    await this.audit.logCreate(actor, "Designation", designation.id, designation);
    return designation;
  }

  @Mutation(() => DesignationModel)
  async updateDesignation(@Args("id") id: string, @Args("input") input: CreateDesignationInput, @CurrentUser() actor: User) {
    const designation = await this.orgStructureService.updateDesignation(id, input);
    await this.audit.logUpdate(actor, "Designation", id, null, designation);
    return designation;
  }

  @Mutation(() => Boolean)
  async deleteDesignation(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.orgStructureService.deleteDesignation(id);
    await this.audit.logDelete(actor, "Designation", id, deleted);
    return true;
  }

  // --- Grades ---

  @Query(() => [GradeModel])
  grades() {
    return this.orgStructureService.findGrades();
  }

  @Mutation(() => GradeModel)
  async createGrade(@Args("input") input: CreateGradeInput, @CurrentUser() actor: User) {
    const grade = await this.orgStructureService.createGrade(input, actor.organizationId);
    await this.audit.logCreate(actor, "Grade", grade.id, grade);
    return grade;
  }

  @Mutation(() => GradeModel)
  async updateGrade(@Args("id") id: string, @Args("input") input: CreateGradeInput, @CurrentUser() actor: User) {
    const grade = await this.orgStructureService.updateGrade(id, input);
    await this.audit.logUpdate(actor, "Grade", id, null, grade);
    return grade;
  }

  @Mutation(() => Boolean)
  async deleteGrade(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.orgStructureService.deleteGrade(id);
    await this.audit.logDelete(actor, "Grade", id, deleted);
    return true;
  }
}
