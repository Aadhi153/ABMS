import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { SupplierPaymentsService } from "./supplier-payments.service";
import { SupplierPaymentModel } from "./models/supplier-payment.model";
import { RecordSupplierPaymentInput } from "./dto/supplier-payment.input";

@Resolver(() => SupplierPaymentModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class SupplierPaymentsResolver {
  constructor(
    private readonly supplierPaymentsService: SupplierPaymentsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [SupplierPaymentModel])
  supplierPayments() {
    return this.supplierPaymentsService.findAll();
  }

  @Mutation(() => SupplierPaymentModel)
  @Roles(Role.ADMIN, Role.PURCHASE)
  async recordSupplierPayment(@Args("input") input: RecordSupplierPaymentInput, @CurrentUser() actor: User) {
    const payment = await this.supplierPaymentsService.recordPayment(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "SupplierPayment", payment.id, payment);
    return payment;
  }

  @Mutation(() => SupplierPaymentModel)
  @Roles(Role.ADMIN)
  async approveSupplierPayment(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.supplierPaymentsService.findById(id);
    const payment = await this.supplierPaymentsService.approve(id, actor.id);
    await this.audit.logUpdate(actor, "SupplierPayment", id, before, payment);
    return payment;
  }

  @Mutation(() => SupplierPaymentModel)
  @Roles(Role.ADMIN)
  async rejectSupplierPayment(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.supplierPaymentsService.findById(id);
    const payment = await this.supplierPaymentsService.reject(id, actor.id);
    await this.audit.logUpdate(actor, "SupplierPayment", id, before, payment);
    return payment;
  }
}
