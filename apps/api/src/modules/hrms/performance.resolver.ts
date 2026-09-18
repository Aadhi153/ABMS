import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { PerformanceService } from "./performance.service";
import { PerformanceReviewModel } from "./models/performance.model";
import { CreatePerformanceReviewInput, GenerateAppraisalCycleInput } from "./dto/performance.input";

@Resolver(() => PerformanceReviewModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PerformanceResolver {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [PerformanceReviewModel])
  performanceReviews(@Args("employeeId", { nullable: true }) employeeId?: string, @Args("status", { nullable: true }) status?: string) {
    return this.performanceService.findAll({ employeeId, status });
  }

  @Query(() => PerformanceReviewModel, { nullable: true })
  performanceReview(@Args("id") id: string) {
    return this.performanceService.findById(id);
  }

  @Mutation(() => PerformanceReviewModel)
  async createPerformanceReview(@Args("input") input: CreatePerformanceReviewInput, @CurrentUser() actor: User) {
    const review = await this.performanceService.create(input, actor.organizationId, actor.id);
    await this.audit.logCreate(actor, "PerformanceReview", review.id, review);
    return review;
  }

  @Mutation(() => [PerformanceReviewModel])
  async generateAppraisalCycle(@Args("input") input: GenerateAppraisalCycleInput, @CurrentUser() actor: User) {
    const reviews = await this.performanceService.generateCycle(input, actor.organizationId, actor.id);
    for (const review of reviews) {
      await this.audit.logCreate(actor, "PerformanceReview", review.id, review);
    }
    return reviews;
  }

  @Mutation(() => PerformanceReviewModel)
  async updatePerformanceReview(@Args("id") id: string, @Args("input") input: CreatePerformanceReviewInput, @CurrentUser() actor: User) {
    const before = await this.performanceService.findById(id);
    const review = await this.performanceService.update(id, input);
    await this.audit.logUpdate(actor, "PerformanceReview", id, before, review);
    return review;
  }

  @Mutation(() => PerformanceReviewModel)
  submitPerformanceReview(@Args("id") id: string) {
    return this.performanceService.submit(id);
  }

  @Mutation(() => PerformanceReviewModel)
  acknowledgePerformanceReview(@Args("id") id: string) {
    return this.performanceService.acknowledge(id);
  }

  @Mutation(() => PerformanceReviewModel)
  closePerformanceReview(@Args("id") id: string) {
    return this.performanceService.close(id);
  }

  @Mutation(() => Boolean)
  async deletePerformanceReview(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.performanceService.delete(id);
    await this.audit.logDelete(actor, "PerformanceReview", id, deleted);
    return true;
  }
}
