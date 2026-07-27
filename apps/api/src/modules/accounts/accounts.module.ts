import { Module } from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { AccountsResolver } from "./accounts.resolver";

@Module({
  providers: [AccountsService, AccountsResolver],
  exports: [AccountsService],
})
export class AccountsModule {}
