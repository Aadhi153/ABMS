import { Inject, Injectable } from "@nestjs/common";
import { NotificationType, type NotificationCategoryKey, type NotificationCategoryPrefs } from "@abms/shared";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { TenantContextService } from "../../common/tenancy/tenant-context";
import { MailerService } from "../../common/mailer/mailer.service";

/**
 * Best-effort mapping from today's (small, generic) NotificationType enum to
 * the richer user-facing categories on the Notifications tab. As dedicated
 * types are added for those event flows (new lead, quote lifecycle, payment
 * received, leave requests), extend this map — types with no entry are only
 * gated by the channel master switch.
 */
const CATEGORY_BY_TYPE: Partial<Record<NotificationType, NotificationCategoryKey>> = {
  [NotificationType.DEAL_WON]: "newLead",
  [NotificationType.LOW_STOCK]: "lowStock",
  [NotificationType.INVOICE_OVERDUE]: "paymentReceived",
  [NotificationType.APPROVAL_NEEDED]: "leaveRequest",
};

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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const category = CATEGORY_BY_TYPE[type];
    const categoryPrefs = (user.notificationCategoryPrefs as NotificationCategoryPrefs | null) ?? {};
    const categoryPref = category ? categoryPrefs[category] : undefined;

    const inAppAllowed = user.notifyInAppEnabled && (categoryPref?.inApp ?? true);
    const emailAllowed = user.notifyEmailEnabled && (categoryPref?.email ?? true);

    const notification = inAppAllowed
      ? await this.prisma.notification.create({ data: { organizationId, userId, type, title, message, link } })
      : null;

    if (emailAllowed) {
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
