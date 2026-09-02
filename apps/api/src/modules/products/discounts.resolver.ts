import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { DiscountsService } from "./discounts.service";
import { DiscountModel } from "./models/discount.model";
import { CreateDiscountInput, UpdateDiscountInput } from "./dto/discount.input";

@Resolver(() => DiscountModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class DiscountsResolver {
  constructor(
    private readonly discountsService: DiscountsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [DiscountModel])
  discounts() {
    return this.discountsService.findAll();
  }

  @Query(() => DiscountModel, { nullable: true })
  discount(@Args("id") id: string) {
    return this.discountsService.findById(id);
  }

  @Mutation(() => DiscountModel)
  @Roles(Role.ADMIN)
  async createDiscount(@Args("input") input: CreateDiscountInput, @CurrentUser() actor: User) {
    const discount = await this.discountsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Discount", discount.id, discount);
    return discount;
  }

  @Mutation(() => DiscountModel)
  @Roles(Role.ADMIN)
  async updateDiscount(@Args("id") id: string, @Args("input") input: UpdateDiscountInput, @CurrentUser() actor: User) {
    const before = await this.discountsService.findById(id);
    const discount = await this.discountsService.update(id, input);
    await this.audit.logUpdate(actor, "Discount", id, before, discount);
    return discount;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN)
  async deleteDiscount(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.discountsService.delete(id);
    await this.audit.logDelete(actor, "Discount", id, deleted);
    return true;
  }
}
