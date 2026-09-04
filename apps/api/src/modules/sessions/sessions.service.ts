import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * Uses the raw PrismaService, not ScopedPrismaClient — Session is deliberately
 * excluded from TENANT_SCOPED_MODELS (scoped transitively via userId), and
 * every method here already takes an explicit userId to filter by, matching
 * how SessionService (common/session) accesses this same table.
 */
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.session.findMany({ where: { userId }, orderBy: { lastActiveAt: "desc" } });
  }

  async revoke(id: string, userId: string) {
    await this.prisma.session.deleteMany({ where: { id, userId } });
  }

  async revokeOthers(userId: string, currentSessionId: string | undefined) {
    await this.prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } });
  }
}
