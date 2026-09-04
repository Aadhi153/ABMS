import { UseGuards } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";
import { NotificationModel } from "./models/notification.model";

@Resolver(() => NotificationModel)
@UseGuards(SessionAuthGuard)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => [NotificationModel])
  myNotifications(
    @Args("limit", { type: () => Int, nullable: true }) limit: number | undefined,
    @CurrentUser() actor: User,
  ) {
    return this.notificationsService.myNotifications(actor.id, limit ?? 30);
  }

  @Query(() => Int)
  unreadNotificationCount(@CurrentUser() actor: User) {
    return this.notificationsService.unreadCount(actor.id);
  }

  @Mutation(() => Boolean)
  async markNotificationRead(@Args("id") id: string, @CurrentUser() actor: User) {
    await this.notificationsService.markRead(id, actor.id);
    return true;
  }

  @Mutation(() => Boolean)
  async markAllNotificationsRead(@CurrentUser() actor: User) {
    await this.notificationsService.markAllRead(actor.id);
    return true;
  }
}
