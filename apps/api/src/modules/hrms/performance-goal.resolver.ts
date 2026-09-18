import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { PerformanceGoalService } from "./performance-goal.service";
import { PerformanceGoalModel } from "./models/performance-goal.model";
import { CreatePerformanceGoalInput } from "./dto/performance-goal.input";

@Resolver(() => PerformanceGoalModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PerformanceGoalResolver {
  constructor(
    private readonly goalService: PerformanceGoalService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [PerformanceGoalModel])
  performanceGoals(
    @Args("employeeId", { nullable: true }) employeeId?: string,
    @Args("branchId", { nullable: true }) branchId?: string,
    @Args("period", { nullable: true }) period?: string,
    @Args("status", { nullable: true }) status?: string,
  ) {
    return this.goalService.findAll({ employeeId, branchId, period, status });
  }

  @Mutation(() => PerformanceGoalModel)
  async createPerformanceGoal(@Args("input") input: CreatePerformanceGoalInput, @CurrentUser() actor: User) {
    const goal = await this.goalService.create(input, actor.organizationId, actor.id);
    await this.audit.logCreate(actor, "PerformanceGoal", goal.id, goal);
    return goal;
  }

  @Mutation(() => PerformanceGoalModel)
  async cancelPerformanceGoal(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.goalService.findById(id);
    const goal = await this.goalService.cancel(id);
    await this.audit.logUpdate(actor, "PerformanceGoal", id, before, goal);
    return goal;
  }
}
