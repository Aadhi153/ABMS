import { Module } from "@nestjs/common";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { PurchaseOrdersResolver } from "./purchase-orders.resolver";
import { GrnService } from "./grn.service";
import { GrnResolver } from "./grn.resolver";
import { SupplierBillsService } from "./supplier-bills.service";
import { SupplierBillsResolver } from "./supplier-bills.resolver";
import { SupplierPaymentsService } from "./supplier-payments.service";
import { SupplierPaymentsResolver } from "./supplier-payments.resolver";
import { DebitNotesService } from "./debit-notes.service";
import { DebitNotesResolver } from "./debit-notes.resolver";

@Module({
  providers: [
    PurchaseOrdersService,
    PurchaseOrdersResolver,
    GrnService,
    GrnResolver,
    SupplierBillsService,
    SupplierBillsResolver,
    SupplierPaymentsService,
    SupplierPaymentsResolver,
    DebitNotesService,
    DebitNotesResolver,
  ],
  exports: [PurchaseOrdersService, GrnService, SupplierBillsService, SupplierPaymentsService, DebitNotesService],
})
export class PurchaseModule {}
