import { Module } from "@nestjs/common";
import { OrgSettingsService } from "./org-settings.service";
import { OrgSettingsResolver } from "./org-settings.resolver";
import { WarehousesService } from "./warehouses.service";
import { WarehousesResolver } from "./warehouses.resolver";
import { TaxRatesService } from "./tax-rates.service";
import { TaxRatesResolver } from "./tax-rates.resolver";

@Module({
  providers: [
    OrgSettingsService,
    OrgSettingsResolver,
    WarehousesService,
    WarehousesResolver,
    TaxRatesService,
    TaxRatesResolver,
  ],
  exports: [WarehousesService, OrgSettingsService, TaxRatesService],
})
export class SettingsModule {}
