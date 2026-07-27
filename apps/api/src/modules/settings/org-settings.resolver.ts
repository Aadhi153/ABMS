import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { OrgSettingsService } from "./org-settings.service";
import { OrgSettingsModel } from "./models/org-settings.model";
import { UpdateOrgSettingsInput } from "./dto/update-org-settings.input";

@Resolver(() => OrgSettingsModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class OrgSettingsResolver {
  constructor(
    private readonly orgSettingsService: OrgSettingsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => OrgSettingsModel)
  orgSettings(@CurrentUser() actor: User) {
    return this.orgSettingsService.get(actor.organizationId);
  }

  @Mutation(() => OrgSettingsModel)
  @Roles(Role.ADMIN)
  async updateOrgSettings(@Args("input") input: UpdateOrgSettingsInput, @CurrentUser() actor: User) {
    const before = await this.orgSettingsService.get(actor.organizationId);
    const updated = await this.orgSettingsService.update(input, actor.organizationId);
    await this.audit.logUpdate(actor, "OrgSettings", updated.id, before, updated);
    return updated;
  }
}
