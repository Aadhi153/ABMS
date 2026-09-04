import { UseGuards } from "@nestjs/common";
import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import type { AuditAction as PrismaAuditAction } from "@abms/database";
import { AuditAction } from "@abms/shared";
import { SessionAuthGuard } from "../guards/session-auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import { AuditService } from "./audit.service";
import { AuditLogModel } from "./models/audit-log.model";
import { AuditActivityPageModel } from "./models/audit-activity-page.model";

@Resolver(() => AuditLogModel)
@UseGuards(SessionAuthGuard)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => AuditActivityPageModel)
  async myAuditActivity(
    @Args("limit", { type: () => Int, nullable: true }) limit: number | undefined,
    @Args("offset", { type: () => Int, nullable: true }) offset: number | undefined,
    @Args("action", { type: () => AuditAction, nullable: true }) action: AuditAction | undefined,
    @Args("from", { type: () => Date, nullable: true }) from: Date | undefined,
    @Args("to", { type: () => Date, nullable: true }) to: Date | undefined,
    @CurrentUser() actor: User,
  ) {
    const { items, hasMore } = await this.auditService.findMine(actor.id, {
      limit: limit ?? 25,
      offset: offset ?? 0,
      action: action as unknown as PrismaAuditAction | undefined,
      from,
      to,
    });
    return {
      items: items.map((row) => ({
        ...row,
        before: row.before ? JSON.stringify(row.before, null, 2) : null,
        after: row.after ? JSON.stringify(row.after, null, 2) : null,
      })),
      hasMore,
    };
  }
}
