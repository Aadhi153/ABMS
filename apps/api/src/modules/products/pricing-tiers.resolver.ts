import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { PricingTiersService } from "./pricing-tiers.service";
import { PricingTierModel } from "./models/pricing-tier.model";
import { CreatePricingTierInput, UpdatePricingTierInput } from "./dto/pricing-tier.input";

@Resolver(() => PricingTierModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class PricingTiersResolver {
  constructor(
    private readonly pricingTiersService: PricingTiersService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [PricingTierModel])
  pricingTiers() {
    return this.pricingTiersService.findAll();
  }

  @Mutation(() => PricingTierModel)
  @Roles(Role.ADMIN)
  async createPricingTier(@Args("input") input: CreatePricingTierInput, @CurrentUser() actor: User) {
    const tier = await this.pricingTiersService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "PricingTier", tier.id, tier);
    return tier;
  }

  @Mutation(() => PricingTierModel)
  @Roles(Role.ADMIN)
  async updatePricingTier(@Args("id") id: string, @Args("input") input: UpdatePricingTierInput, @CurrentUser() actor: User) {
    const before = await this.pricingTiersService.findById(id);
    const tier = await this.pricingTiersService.update(id, input);
    await this.audit.logUpdate(actor, "PricingTier", id, before, tier);
    return tier;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN)
  async deletePricingTier(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.pricingTiersService.delete(id);
    await this.audit.logDelete(actor, "PricingTier", id, deleted);
    return true;
  }
}
