import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { PriceListsService } from "./price-lists.service";
import { PriceListModel, PriceListItemModel } from "./models/price-list.model";
import { CreatePriceListInput, UpdatePriceListInput, UpsertPriceListItemInput } from "./dto/price-list.input";

@Resolver(() => PriceListModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class PriceListsResolver {
  constructor(
    private readonly priceListsService: PriceListsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [PriceListModel])
  priceLists() {
    return this.priceListsService.findAll();
  }

  @Query(() => PriceListModel, { nullable: true })
  priceList(@Args("id") id: string) {
    return this.priceListsService.findById(id);
  }

  @Mutation(() => PriceListModel)
  @Roles(Role.ADMIN)
  async createPriceList(@Args("input") input: CreatePriceListInput, @CurrentUser() actor: User) {
    const priceList = await this.priceListsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "PriceList", priceList.id, priceList);
    return priceList;
  }

  @Mutation(() => PriceListModel)
  @Roles(Role.ADMIN)
  async updatePriceList(@Args("id") id: string, @Args("input") input: UpdatePriceListInput, @CurrentUser() actor: User) {
    const before = await this.priceListsService.findById(id);
    const priceList = await this.priceListsService.update(id, input);
    await this.audit.logUpdate(actor, "PriceList", id, before, priceList);
    return priceList;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN)
  async deletePriceList(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.priceListsService.delete(id);
    await this.audit.logDelete(actor, "PriceList", id, deleted);
    return true;
  }

  @Mutation(() => PriceListItemModel)
  @Roles(Role.ADMIN)
  async upsertPriceListItem(@Args("input") input: UpsertPriceListItemInput, @CurrentUser() actor: User) {
    const item = await this.priceListsService.upsertItem(input);
    await this.audit.logUpdate(actor, "PriceListItem", item.id, null, item);
    return item;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN)
  async removePriceListItem(@Args("id") id: string, @CurrentUser() actor: User) {
    await this.priceListsService.removeItem(id);
    await this.audit.logDelete(actor, "PriceListItem", id, null);
    return true;
  }
}
