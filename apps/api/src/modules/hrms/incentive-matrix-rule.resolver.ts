import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { IncentiveMatrixRuleService } from "./incentive-matrix-rule.service";
import { IncentiveMatrixRuleModel } from "./models/incentive-matrix-rule.model";
import { CreateIncentiveMatrixRuleInput } from "./dto/incentive-matrix-rule.input";

@Resolver(() => IncentiveMatrixRuleModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IncentiveMatrixRuleResolver {
  constructor(
    private readonly ruleService: IncentiveMatrixRuleService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [IncentiveMatrixRuleModel])
  incentiveMatrixRules() {
    return this.ruleService.findAll();
  }

  @Mutation(() => IncentiveMatrixRuleModel)
  async createIncentiveMatrixRule(@Args("input") input: CreateIncentiveMatrixRuleInput, @CurrentUser() actor: User) {
    const rule = await this.ruleService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "IncentiveMatrixRule", rule.id, rule);
    return rule;
  }

  @Mutation(() => Boolean)
  async deleteIncentiveMatrixRule(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.ruleService.delete(id);
    await this.audit.logDelete(actor, "IncentiveMatrixRule", id, deleted);
    return true;
  }
}
