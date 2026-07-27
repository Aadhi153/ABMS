import { Module } from "@nestjs/common";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { PurchaseOrdersResolver } from "./purchase-orders.resolver";
import { GrnService } from "./grn.service";
import { GrnResolver } from "./grn.resolver";
import { SupplierBillsService } from "./supplier-bills.service";
import { SupplierBillsResolver } from "./supplier-bills.resolver";

@Module({
  providers: [
    PurchaseOrdersService,
    PurchaseOrdersResolver,
    GrnService,
    GrnResolver,
    SupplierBillsService,
    SupplierBillsResolver,
  ],
  exports: [PurchaseOrdersService, GrnService, SupplierBillsService],
})
export class PurchaseModule {}
