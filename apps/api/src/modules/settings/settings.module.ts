import { Module } from "@nestjs/common";
import { OrgSettingsService } from "./org-settings.service";
import { OrgSettingsResolver } from "./org-settings.resolver";
import { WarehousesService } from "./warehouses.service";
import { WarehousesResolver } from "./warehouses.resolver";

@Module({
  providers: [OrgSettingsService, OrgSettingsResolver, WarehousesService, WarehousesResolver],
  exports: [WarehousesService, OrgSettingsService],
})
export class SettingsModule {}
