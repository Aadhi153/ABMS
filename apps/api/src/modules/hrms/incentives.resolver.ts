import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { IncentivesService } from "./incentives.service";
import { IncentiveModel } from "./models/incentive.model";
import { CreateIncentiveInput, CreateManualIncentiveInput } from "./dto/incentive.input";

@Resolver(() => IncentiveModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IncentivesResolver {
  constructor(
    private readonly incentivesService: IncentivesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [IncentiveModel])
  incentives(@Args("employeeId", { nullable: true }) employeeId?: string, @Args("status", { nullable: true }) status?: string) {
    return this.incentivesService.findAll({ employeeId, status });
  }

  @Query(() => IncentiveModel, { nullable: true })
  incentive(@Args("id") id: string) {
    return this.incentivesService.findById(id);
  }

  @Mutation(() => IncentiveModel)
  async createIncentive(@Args("input") input: CreateIncentiveInput, @CurrentUser() actor: User) {
    const incentive = await this.incentivesService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Incentive", incentive.id, incentive);
    return incentive;
  }

  @Mutation(() => [IncentiveModel])
  async createManualIncentive(@Args("input") input: CreateManualIncentiveInput, @CurrentUser() actor: User) {
    const incentives = await this.incentivesService.createManual(input, actor.organizationId);
    for (const incentive of incentives) {
      await this.audit.logCreate(actor, "Incentive", incentive.id, incentive);
    }
    return incentives;
  }

  @Mutation(() => IncentiveModel)
  async approveIncentive(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.incentivesService.findById(id);
    const incentive = await this.incentivesService.approve(id, actor.id);
    await this.audit.logUpdate(actor, "Incentive", id, before, incentive);
    return incentive;
  }

  @Mutation(() => IncentiveModel)
  async rejectIncentive(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.incentivesService.findById(id);
    const incentive = await this.incentivesService.reject(id, actor.id);
    await this.audit.logUpdate(actor, "Incentive", id, before, incentive);
    return incentive;
  }

  @Mutation(() => Boolean)
  async deleteIncentive(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.incentivesService.delete(id);
    await this.audit.logDelete(actor, "Incentive", id, deleted);
    return true;
  }
}
