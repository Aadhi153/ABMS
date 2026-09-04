import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { DealStage, NotificationType, Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DealsService } from "./deals.service";
import { DealModel } from "./models/deal.model";
import { CreateDealInput, UpdateDealInput } from "./dto/deal.input";

@Resolver(() => DealModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class DealsResolver {
  constructor(
    private readonly dealsService: DealsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  @Query(() => [DealModel])
  deals() {
    return this.dealsService.findAll();
  }

  @Query(() => DealModel, { nullable: true })
  deal(@Args("id") id: string) {
    return this.dealsService.findById(id);
  }

  @Mutation(() => DealModel)
  @Roles(Role.ADMIN, Role.SALES)
  async createDeal(@Args("input") input: CreateDealInput, @CurrentUser() actor: User) {
    const deal = await this.dealsService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "Deal", deal.id, deal);
    return deal;
  }

  @Mutation(() => DealModel)
  @Roles(Role.ADMIN, Role.SALES)
  async updateDeal(@Args("id") id: string, @Args("input") input: UpdateDealInput, @CurrentUser() actor: User) {
    const before = await this.dealsService.findById(id);
    const deal = await this.dealsService.update(id, input);
    await this.audit.logUpdate(actor, "Deal", id, before, deal);
    if (before?.stage !== DealStage.WON && deal.stage === DealStage.WON) {
      await this.notifications.notify(
        deal.ownerId,
        NotificationType.DEAL_WON,
        "Deal won 🎉",
        `${deal.title} was marked as won.`,
        `/crm/deals/${deal.id}`,
      );
    }
    return deal;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES)
  async deleteDeal(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.dealsService.delete(id);
    await this.audit.logDelete(actor, "Deal", id, deleted);
    return true;
  }
}
