import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { WarehousesService } from "./warehouses.service";
import { WarehouseModel } from "./models/warehouse.model";
import { CreateWarehouseInput, UpdateWarehouseInput } from "./dto/warehouse.input";

@Resolver(() => WarehouseModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class WarehousesResolver {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [WarehouseModel])
  warehouses() {
    return this.warehousesService.findAll();
  }

  @Mutation(() => WarehouseModel)
  @Roles(Role.ADMIN)
  async createWarehouse(@Args("input") input: CreateWarehouseInput, @CurrentUser() actor: User) {
    const warehouse = await this.warehousesService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Warehouse", warehouse.id, warehouse);
    return warehouse;
  }

  @Mutation(() => WarehouseModel)
  @Roles(Role.ADMIN)
  async updateWarehouse(
    @Args("id") id: string,
    @Args("input") input: UpdateWarehouseInput,
    @CurrentUser() actor: User,
  ) {
    const before = await this.warehousesService.findById(id);
    const warehouse = await this.warehousesService.update(id, input);
    await this.audit.logUpdate(actor, "Warehouse", id, before, warehouse);
    return warehouse;
  }
}
