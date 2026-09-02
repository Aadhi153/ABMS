import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { TaxGroupsService } from "./tax-groups.service";
import { TaxGroupModel } from "./models/tax-group.model";
import { CreateTaxGroupInput, UpdateTaxGroupInput } from "./dto/tax-group.input";

@Resolver(() => TaxGroupModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class TaxGroupsResolver {
  constructor(
    private readonly taxGroupsService: TaxGroupsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [TaxGroupModel])
  taxGroups() {
    return this.taxGroupsService.findAll();
  }

  @Query(() => TaxGroupModel, { nullable: true })
  taxGroup(@Args("id") id: string) {
    return this.taxGroupsService.findById(id);
  }

  @Mutation(() => TaxGroupModel)
  @Roles(Role.ADMIN)
  async createTaxGroup(@Args("input") input: CreateTaxGroupInput, @CurrentUser() actor: User) {
    const taxGroup = await this.taxGroupsService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "TaxGroup", taxGroup.id, taxGroup);
    return taxGroup;
  }

  @Mutation(() => TaxGroupModel)
  @Roles(Role.ADMIN)
  async updateTaxGroup(@Args("id") id: string, @Args("input") input: UpdateTaxGroupInput, @CurrentUser() actor: User) {
    const before = await this.taxGroupsService.findById(id);
    const taxGroup = await this.taxGroupsService.update(id, input);
    await this.audit.logUpdate(actor, "TaxGroup", id, before, taxGroup);
    return taxGroup;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN)
  async deleteTaxGroup(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.taxGroupsService.delete(id);
    await this.audit.logDelete(actor, "TaxGroup", id, deleted);
    return true;
  }
}
