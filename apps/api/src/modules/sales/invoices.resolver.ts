import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { InvoicesService } from "./invoices.service";
import { InvoiceModel } from "./models/invoice.model";
import { RecordPaymentInput } from "./dto/invoice.input";

@Resolver(() => InvoiceModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class InvoicesResolver {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [InvoiceModel])
  invoices() {
    return this.invoicesService.findAll();
  }

  @Query(() => InvoiceModel, { nullable: true })
  invoice(@Args("id") id: string) {
    return this.invoicesService.findById(id);
  }

  @Mutation(() => InvoiceModel)
  @Roles(Role.ADMIN, Role.SALES, Role.ACCOUNTANT)
  async generateInvoice(@Args("salesOrderId") salesOrderId: string, @CurrentUser() actor: User) {
    const invoice = await this.invoicesService.generateFromOrder(salesOrderId, actor.organizationId);
    await this.audit.logCreate(actor, "Invoice", invoice.id, invoice);
    return invoice;
  }

  @Mutation(() => InvoiceModel)
  @Roles(Role.ADMIN, Role.SALES, Role.ACCOUNTANT)
  async recordPayment(@Args("input") input: RecordPaymentInput, @CurrentUser() actor: User) {
    const before = await this.invoicesService.findById(input.invoiceId);
    const invoice = await this.invoicesService.recordPayment(input, actor.organizationId);
    await this.audit.logUpdate(actor, "Invoice", input.invoiceId, before, invoice);
    return invoice;
  }
}
