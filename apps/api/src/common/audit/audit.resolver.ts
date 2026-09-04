import { UseGuards } from "@nestjs/common";
import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { SessionAuthGuard } from "../guards/session-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import { AuditService } from "./audit.service";
import { AuditLogModel } from "./models/audit-log.model";

@Resolver(() => AuditLogModel)
@UseGuards(SessionAuthGuard)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => [AuditLogModel])
  async myAuditActivity(
    @Args("limit", { type: () => Int, nullable: true }) limit: number | undefined,
    @CurrentUser() actor: User,
  ) {
    const rows = await this.auditService.findMine(actor.id, limit ?? 50);
    return rows.map((row) => ({
      ...row,
      before: row.before ? JSON.stringify(row.before, null, 2) : null,
      after: row.after ? JSON.stringify(row.after, null, 2) : null,
    }));
  }
}
