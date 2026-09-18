import { UseGuards } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { AllowanceDeductionService } from "./allowance-deduction.service";
import { AllowanceDeductionEntryModel, AllowanceDeductionSummaryModel } from "./models/allowance-deduction.model";
import { AllowanceDeductionFilterInput, CreateAllowanceDeductionInput } from "./dto/allowance-deduction.input";

@Resolver(() => AllowanceDeductionEntryModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AllowanceDeductionResolver {
  constructor(
    private readonly service: AllowanceDeductionService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [AllowanceDeductionEntryModel])
  allowanceDeductionEntries(@Args("filter", { nullable: true }) filter?: AllowanceDeductionFilterInput) {
    return this.service.findAll(filter);
  }

  @Query(() => AllowanceDeductionEntryModel, { nullable: true })
  allowanceDeductionEntry(@Args("id") id: string) {
    return this.service.findById(id);
  }

  @Query(() => AllowanceDeductionSummaryModel)
  allowanceDeductionSummary(@Args("month", { type: () => Int }) month: number, @Args("year", { type: () => Int }) year: number) {
    return this.service.summary(month, year);
  }

  @Mutation(() => AllowanceDeductionEntryModel)
  async createAllowanceDeductionEntry(@Args("input") input: CreateAllowanceDeductionInput, @CurrentUser() actor: User) {
    const entry = await this.service.create(input, actor.organizationId, actor.id);
    await this.audit.logCreate(actor, "AllowanceDeductionEntry", entry.id, entry);
    return entry;
  }

  @Mutation(() => AllowanceDeductionEntryModel)
  async updateAllowanceDeductionEntry(@Args("id") id: string, @Args("input") input: CreateAllowanceDeductionInput, @CurrentUser() actor: User) {
    const before = await this.service.findById(id);
    const entry = await this.service.update(id, input);
    await this.audit.logUpdate(actor, "AllowanceDeductionEntry", id, before, entry);
    return entry;
  }

  @Mutation(() => Boolean)
  async deleteAllowanceDeductionEntry(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.service.delete(id);
    await this.audit.logDelete(actor, "AllowanceDeductionEntry", id, deleted);
    return true;
  }
}
