import { Inject, Injectable } from "@nestjs/common";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import type { UpdateOrgSettingsInput } from "./dto/update-org-settings.input";

@Injectable()
export class OrgSettingsService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  async get(organizationId: string) {
    const existing = await this.prisma.orgSettings.findFirst();
    if (existing) return existing;
    return this.prisma.orgSettings.create({ data: { companyName: "New Organization", organizationId } });
  }

  async update(input: UpdateOrgSettingsInput, organizationId: string) {
    const existing = await this.get(organizationId);
    return this.prisma.orgSettings.update({ where: { id: existing.id }, data: input });
  }
}
