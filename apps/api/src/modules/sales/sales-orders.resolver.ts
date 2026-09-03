import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { SalesOrdersService } from "./sales-orders.service";
import { SalesOrderModel } from "./models/sales-order.model";
import { CreateSalesOrderInput } from "./dto/sales-order.input";

@Resolver(() => SalesOrderModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class SalesOrdersResolver {
  constructor(
    private readonly salesOrdersService: SalesOrdersService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [SalesOrderModel])
  salesOrders() {
    return this.salesOrdersService.findAll();
  }

  @Query(() => SalesOrderModel, { nullable: true })
  salesOrder(@Args("id") id: string) {
    return this.salesOrdersService.findById(id);
  }

  @Mutation(() => SalesOrderModel)
  @Roles(Role.ADMIN, Role.SALES)
  async createSalesOrder(@Args("input") input: CreateSalesOrderInput, @CurrentUser() actor: User) {
    const order = await this.salesOrdersService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "SalesOrder", order.id, order);
    return order;
  }

  @Mutation(() => SalesOrderModel)
  @Roles(Role.ADMIN, Role.SALES)
  async confirmSalesOrder(
    @Args("id") id: string,
    @Args("warehouseId", { type: () => String, nullable: true }) warehouseId: string | undefined,
    @CurrentUser() actor: User,
  ) {
    const before = await this.salesOrdersService.findById(id);
    const order = await this.salesOrdersService.confirm(id, warehouseId, actor.id, actor.organizationId);
    await this.audit.logUpdate(actor, "SalesOrder", id, before, order);
    return order;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES)
  async cancelSalesOrder(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.salesOrdersService.findById(id);
    const order = await this.salesOrdersService.cancel(id);
    await this.audit.logUpdate(actor, "SalesOrder", id, before, order);
    return true;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES)
  async deleteSalesOrder(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.salesOrdersService.delete(id);
    await this.audit.logDelete(actor, "SalesOrder", id, deleted);
    return true;
  }
}
