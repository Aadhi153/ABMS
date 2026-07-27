import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { CustomersService } from "./customers.service";
import { CustomerModel, CustomerOrderSummaryModel } from "./models/customer.model";
import { CreateCustomerInput, UpdateCustomerInput } from "./dto/customer.input";

@Resolver(() => CustomerModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class CustomersResolver {
  constructor(
    private readonly customersService: CustomersService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [CustomerModel])
  customers() {
    return this.customersService.findAll();
  }

  @Query(() => CustomerModel, { nullable: true })
  customer(@Args("id") id: string) {
    return this.customersService.findById(id);
  }

  @Query(() => [CustomerOrderSummaryModel])
  customerOrders(@Args("customerId") customerId: string) {
    return this.customersService.orderHistory(customerId);
  }

  @Mutation(() => CustomerModel)
  @Roles(Role.ADMIN, Role.SALES, Role.ACCOUNTANT)
  async createCustomer(@Args("input") input: CreateCustomerInput, @CurrentUser() actor: User) {
    const customer = await this.customersService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Customer", customer.id, customer);
    return customer;
  }

  @Mutation(() => CustomerModel)
  @Roles(Role.ADMIN, Role.SALES, Role.ACCOUNTANT)
  async updateCustomer(@Args("id") id: string, @Args("input") input: UpdateCustomerInput, @CurrentUser() actor: User) {
    const before = await this.customersService.findById(id);
    const customer = await this.customersService.update(id, input);
    await this.audit.logUpdate(actor, "Customer", id, before, customer);
    return customer;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES, Role.ACCOUNTANT)
  async deleteCustomer(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.customersService.delete(id);
    await this.audit.logDelete(actor, "Customer", id, deleted);
    return true;
  }
}
