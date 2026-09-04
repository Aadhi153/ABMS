import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { CompaniesService } from "./companies.service";
import { CompaniesResolver } from "./companies.resolver";
import { ContactsService } from "./contacts.service";
import { ContactsResolver } from "./contacts.resolver";
import { DealsService } from "./deals.service";
import { DealsResolver } from "./deals.resolver";
import { TasksService } from "./tasks.service";
import { TasksResolver } from "./tasks.resolver";

@Module({
  imports: [NotificationsModule],
  providers: [
    CompaniesService,
    CompaniesResolver,
    ContactsService,
    ContactsResolver,
    DealsService,
    DealsResolver,
    TasksService,
    TasksResolver,
  ],
  exports: [ContactsService, DealsService],
})
export class CrmModule {}
