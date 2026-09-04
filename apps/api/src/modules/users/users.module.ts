import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersService } from "./users.service";
import { UsersResolver } from "./users.resolver";
import { UserFieldsResolver } from "./user-fields.resolver";

@Module({
  imports: [NotificationsModule],
  providers: [UsersService, UsersResolver, UserFieldsResolver],
  exports: [UsersService],
})
export class UsersModule {}
