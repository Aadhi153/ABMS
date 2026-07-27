import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { TaxRatesService } from "./tax-rates.service";
import { TaxRateModel } from "./models/tax-rate.model";
import { CreateTaxRateInput, UpdateTaxRateInput } from "./dto/tax-rate.input";

@Resolver(() => TaxRateModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class TaxRatesResolver {
  constructor(
    private readonly taxRatesService: TaxRatesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [TaxRateModel])
  taxRates() {
    return this.taxRatesService.findAll();
  }

  @Mutation(() => TaxRateModel)
  @Roles(Role.ADMIN)
  async createTaxRate(@Args("input") input: CreateTaxRateInput, @CurrentUser() actor: User) {
    const taxRate = await this.taxRatesService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "TaxRate", taxRate.id, taxRate);
    return taxRate;
  }

  @Mutation(() => TaxRateModel)
  @Roles(Role.ADMIN)
  async updateTaxRate(@Args("id") id: string, @Args("input") input: UpdateTaxRateInput, @CurrentUser() actor: User) {
    const before = await this.taxRatesService.findById(id);
    const taxRate = await this.taxRatesService.update(id, input);
    await this.audit.logUpdate(actor, "TaxRate", id, before, taxRate);
    return taxRate;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN)
  async deleteTaxRate(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.taxRatesService.delete(id);
    await this.audit.logDelete(actor, "TaxRate", id, deleted);
    return true;
  }
}
