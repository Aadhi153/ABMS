import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { SuppliersService } from "./suppliers.service";
import { SupplierModel, SupplierPurchaseSummaryModel } from "./models/supplier.model";
import { CreateSupplierInput, UpdateSupplierInput } from "./dto/supplier.input";

@Resolver(() => SupplierModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class SuppliersResolver {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [SupplierModel])
  suppliers() {
    return this.suppliersService.findAll();
  }

  @Query(() => SupplierModel, { nullable: true })
  supplier(@Args("id") id: string) {
    return this.suppliersService.findById(id);
  }

  @Query(() => [SupplierPurchaseSummaryModel])
  supplierPurchases(@Args("supplierId") supplierId: string) {
    return this.suppliersService.purchaseHistory(supplierId);
  }

  @Mutation(() => SupplierModel)
  @Roles(Role.ADMIN, Role.PURCHASE, Role.ACCOUNTANT)
  async createSupplier(@Args("input") input: CreateSupplierInput, @CurrentUser() actor: User) {
    const supplier = await this.suppliersService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Supplier", supplier.id, supplier);
    return supplier;
  }

  @Mutation(() => SupplierModel)
  @Roles(Role.ADMIN, Role.PURCHASE, Role.ACCOUNTANT)
  async updateSupplier(@Args("id") id: string, @Args("input") input: UpdateSupplierInput, @CurrentUser() actor: User) {
    const before = await this.suppliersService.findById(id);
    const supplier = await this.suppliersService.update(id, input);
    await this.audit.logUpdate(actor, "Supplier", id, before, supplier);
    return supplier;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.PURCHASE, Role.ACCOUNTANT)
  async deleteSupplier(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.suppliersService.delete(id);
    await this.audit.logDelete(actor, "Supplier", id, deleted);
    return true;
  }
}
