import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { PurchaseOrderModel } from "./models/purchase-order.model";
import { CreatePurchaseOrderInput } from "./dto/purchase-order.input";

@Resolver(() => PurchaseOrderModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class PurchaseOrdersResolver {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [PurchaseOrderModel])
  purchaseOrders() {
    return this.purchaseOrdersService.findAll();
  }

  @Query(() => PurchaseOrderModel, { nullable: true })
  purchaseOrder(@Args("id") id: string) {
    return this.purchaseOrdersService.findById(id);
  }

  @Mutation(() => PurchaseOrderModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async createPurchaseOrder(@Args("input") input: CreatePurchaseOrderInput, @CurrentUser() actor: User) {
    const order = await this.purchaseOrdersService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "PurchaseOrder", order.id, order);
    return order;
  }

  @Mutation(() => PurchaseOrderModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async sendPurchaseOrder(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.purchaseOrdersService.findById(id);
    const order = await this.purchaseOrdersService.send(id);
    await this.audit.logUpdate(actor, "PurchaseOrder", id, before, order);
    return order;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async deletePurchaseOrder(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.purchaseOrdersService.delete(id);
    await this.audit.logDelete(actor, "PurchaseOrder", id, deleted);
    return true;
  }
}
