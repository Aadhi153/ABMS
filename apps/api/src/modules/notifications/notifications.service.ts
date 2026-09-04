import { Inject, Injectable } from "@nestjs/common";
import { NotificationType } from "@abms/shared";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { TenantContextService } from "../../common/tenancy/tenant-context";
import { MailerService } from "../../common/mailer/mailer.service";

/**
 * notify() is called from inside other modules' already-guarded mutations
 * (e.g. updateDeal, updateUser), so a tenant context always exists — safe to
 * use ScopedPrismaClient throughout, unlike auth/sessions which run pre-auth.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient,
    private readonly tenantContext: TenantContextService,
    private readonly mailer: MailerService,
  ) {}

  async notify(userId: string, type: NotificationType, title: string, message: string, link?: string) {
    const organizationId = this.tenantContext.get()!.organizationId;
    const notification = await this.prisma.notification.create({
      data: { organizationId, userId, type, title, message, link },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.notifyEmailEnabled) {
      await this.mailer.sendNotificationEmail(user.email, title, message, link).catch(() => {});
    }
    return notification;
  }

  myNotifications(userId: string, limit: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}
