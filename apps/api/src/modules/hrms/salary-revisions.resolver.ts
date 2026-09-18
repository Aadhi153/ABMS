import { UseGuards } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { SalaryRevisionsService } from "./salary-revisions.service";
import { PromotionRecommendationModel, SalaryIncrementRowModel, SalaryRevisionModel } from "./models/salary-revision.model";
import { CreateSalaryRevisionInput, SaveSalaryIncrementsInput } from "./dto/salary-revision.input";

@Resolver(() => SalaryRevisionModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SalaryRevisionsResolver {
  constructor(
    private readonly salaryRevisionsService: SalaryRevisionsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [SalaryRevisionModel])
  salaryRevisions(
    @Args("employeeId", { nullable: true }) employeeId?: string,
    @Args("status", { nullable: true }) status?: string,
    @Args("revisionType", { nullable: true }) revisionType?: string,
  ) {
    return this.salaryRevisionsService.findAll({ employeeId, status, revisionType });
  }

  @Query(() => SalaryRevisionModel, { nullable: true })
  salaryRevision(@Args("id") id: string) {
    return this.salaryRevisionsService.findById(id);
  }

  @Mutation(() => SalaryRevisionModel)
  async createSalaryRevision(@Args("input") input: CreateSalaryRevisionInput, @CurrentUser() actor: User) {
    const revision = await this.salaryRevisionsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "SalaryRevision", revision.id, revision);
    return revision;
  }

  @Mutation(() => SalaryRevisionModel)
  async approveSalaryRevision(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.salaryRevisionsService.findById(id);
    const revision = await this.salaryRevisionsService.approve(id, actor.id);
    await this.audit.logUpdate(actor, "SalaryRevision", id, before, revision);
    return revision;
  }

  @Mutation(() => SalaryRevisionModel)
  async rejectSalaryRevision(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.salaryRevisionsService.findById(id);
    const revision = await this.salaryRevisionsService.reject(id, actor.id);
    await this.audit.logUpdate(actor, "SalaryRevision", id, before, revision);
    return revision;
  }

  @Mutation(() => Boolean)
  async deleteSalaryRevision(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.salaryRevisionsService.delete(id);
    await this.audit.logDelete(actor, "SalaryRevision", id, deleted);
    return true;
  }

  // --- Promotion eligibility ---

  @Query(() => [PromotionRecommendationModel])
  promotionRecommendations() {
    return this.salaryRevisionsService.getPromotionRecommendations();
  }

  @Mutation(() => SalaryRevisionModel)
  async promoteEmployee(@Args("employeeId") employeeId: string, @CurrentUser() actor: User) {
    const revision = await this.salaryRevisionsService.promoteEmployee(employeeId, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "SalaryRevision", revision.id, revision);
    return revision;
  }

  // --- Bulk salary increment ---

  @Query(() => [SalaryIncrementRowModel])
  salaryIncrementRows(
    @Args("branchId", { nullable: true }) branchId?: string,
    @Args("department", { nullable: true }) department?: string,
    @Args("search", { nullable: true }) search?: string,
  ) {
    return this.salaryRevisionsService.getSalaryIncrementRows({ branchId, department, search });
  }

  @Mutation(() => Int)
  async saveSalaryIncrements(@Args("input") input: SaveSalaryIncrementsInput, @CurrentUser() actor: User) {
    const count = await this.salaryRevisionsService.saveSalaryIncrements(input, actor.id, actor.organizationId);
    await this.audit.logUpdate(actor, "SalaryRevision", "bulk-increment", null, { rows: input.rows.length, effectiveDate: input.effectiveDate });
    return count;
  }
}
