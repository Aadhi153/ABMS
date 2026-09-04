import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { GeoService } from "../../common/geo/geo.service";

/**
 * Uses the raw PrismaService, not ScopedPrismaClient — Session is deliberately
 * excluded from TENANT_SCOPED_MODELS (scoped transitively via userId), and
 * every method here already takes an explicit userId to filter by, matching
 * how SessionService (common/session) accesses this same table.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  /**
   * Only genuinely active (non-expired) sessions — expired rows used to
   * linger here until whichever session next made an authenticated request
   * (the only place that lazily deletes them), which is what made the list
   * balloon with long-dead logins. Also opportunistically backfills
   * `location` for older rows created before that column existed.
   */
  async listForUser(userId: string) {
    void this.prisma.session.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } }).catch(() => {});

    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
    });

    await Promise.all(
      sessions
        .filter((s) => !s.location && s.ipAddress)
        .map(async (s) => {
          const location = await this.geo.resolveLocation(s.ipAddress);
          if (location) {
            s.location = location;
            await this.prisma.session.update({ where: { id: s.id }, data: { location } }).catch(() => {});
          }
        }),
    );

    return sessions;
  }

  async revoke(id: string, userId: string) {
    await this.prisma.session.deleteMany({ where: { id, userId } });
  }

  async revokeOthers(userId: string, currentSessionId: string | undefined) {
    await this.prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } });
  }
}
