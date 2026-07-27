import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { SupplierBillStatus } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { SupplierBillsService } from "./supplier-bills.service";
import { SupplierBillModel } from "./models/supplier-bill.model";
import { CreateSupplierBillInput } from "./dto/supplier-bill.input";

@Resolver(() => SupplierBillModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class SupplierBillsResolver {
  constructor(
    private readonly supplierBillsService: SupplierBillsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [SupplierBillModel])
  supplierBills() {
    return this.supplierBillsService.findAll();
  }

  @Query(() => SupplierBillModel, { nullable: true })
  supplierBill(@Args("id") id: string) {
    return this.supplierBillsService.findById(id);
  }

  @Mutation(() => SupplierBillModel)
  @Roles(Role.ADMIN, Role.PURCHASE, Role.ACCOUNTANT)
  async createSupplierBill(@Args("input") input: CreateSupplierBillInput, @CurrentUser() actor: User) {
    const bill = await this.supplierBillsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "SupplierBill", bill.id, bill);
    return bill;
  }

  @Mutation(() => SupplierBillModel)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  async updateSupplierBillStatus(
    @Args("id") id: string,
    @Args("status", { type: () => String }) status: SupplierBillStatus,
    @CurrentUser() actor: User,
  ) {
    const before = await this.supplierBillsService.findById(id);
    const bill = await this.supplierBillsService.updateStatus(id, status);
    await this.audit.logUpdate(actor, "SupplierBill", id, before, bill);
    return bill;
  }
}
