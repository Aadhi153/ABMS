import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { KpiTemplateService } from "./kpi-template.service";
import { KpiTemplateModel } from "./models/kpi-template.model";
import { CreateKpiTemplateInput } from "./dto/kpi-template.input";

@Resolver(() => KpiTemplateModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class KpiTemplateResolver {
  constructor(
    private readonly kpiTemplateService: KpiTemplateService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [KpiTemplateModel])
  kpiTemplates() {
    return this.kpiTemplateService.findAll();
  }

  @Query(() => KpiTemplateModel, { nullable: true })
  kpiTemplate(@Args("id") id: string) {
    return this.kpiTemplateService.findById(id);
  }

  @Mutation(() => KpiTemplateModel)
  async createKpiTemplate(@Args("input") input: CreateKpiTemplateInput, @CurrentUser() actor: User) {
    const template = await this.kpiTemplateService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "KpiTemplate", template.id, template);
    return template;
  }

  @Mutation(() => KpiTemplateModel)
  async setKpiTemplateActive(@Args("id") id: string, @Args("active") active: boolean, @CurrentUser() actor: User) {
    const before = await this.kpiTemplateService.findById(id);
    const template = await this.kpiTemplateService.setActive(id, active);
    await this.audit.logUpdate(actor, "KpiTemplate", id, before, template);
    return template;
  }

  @Mutation(() => Boolean)
  async deleteKpiTemplate(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.kpiTemplateService.delete(id);
    await this.audit.logDelete(actor, "KpiTemplate", id, deleted);
    return true;
  }
}
