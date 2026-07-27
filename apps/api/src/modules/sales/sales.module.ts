import { Module } from "@nestjs/common";
import { SalesOrdersService } from "./sales-orders.service";
import { SalesOrdersResolver } from "./sales-orders.resolver";
import { InvoicesService } from "./invoices.service";
import { InvoicesResolver } from "./invoices.resolver";

@Module({
  providers: [SalesOrdersService, SalesOrdersResolver, InvoicesService, InvoicesResolver],
  exports: [SalesOrdersService, InvoicesService],
})
export class SalesModule {}
