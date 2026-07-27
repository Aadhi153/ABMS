import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { CompaniesService } from "./companies.service";
import { CompanyModel } from "./models/company.model";
import { ContactModel } from "./models/contact.model";
import { CreateCompanyInput, UpdateCompanyInput } from "./dto/company.input";

@Resolver(() => CompanyModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class CompaniesResolver {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [CompanyModel])
  companies() {
    return this.companiesService.findAll();
  }

  @Query(() => CompanyModel, { nullable: true })
  company(@Args("id") id: string) {
    return this.companiesService.findById(id);
  }

  @Query(() => [ContactModel])
  companyContacts(@Args("companyId") companyId: string) {
    return this.companiesService.contactsFor(companyId).then((rows) =>
      rows.map((r) => ({ ...r, companyName: r.company?.name ?? null })),
    );
  }

  @Mutation(() => CompanyModel)
  @Roles(Role.ADMIN, Role.SALES)
  async createCompany(@Args("input") input: CreateCompanyInput, @CurrentUser() actor: User) {
    const company = await this.companiesService.create(input, actor.organizationId);
    await this.audit.logCreate(actor, "Company", company.id, company);
    return company;
  }

  @Mutation(() => CompanyModel)
  @Roles(Role.ADMIN, Role.SALES)
  async updateCompany(@Args("id") id: string, @Args("input") input: UpdateCompanyInput, @CurrentUser() actor: User) {
    const before = await this.companiesService.findById(id);
    const company = await this.companiesService.update(id, input);
    await this.audit.logUpdate(actor, "Company", id, before, company);
    return company;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES)
  async deleteCompany(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.companiesService.delete(id);
    await this.audit.logDelete(actor, "Company", id, deleted);
    return true;
  }
}
