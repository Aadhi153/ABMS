import { Module } from "@nestjs/common";
import { SalesOrdersService } from "./sales-orders.service";
import { SalesOrdersResolver } from "./sales-orders.resolver";
import { InvoicesService } from "./invoices.service";
import { InvoicesResolver } from "./invoices.resolver";
import { QuotesService } from "./quotes.service";
import { QuotesResolver } from "./quotes.resolver";

@Module({
  providers: [SalesOrdersService, SalesOrdersResolver, InvoicesService, InvoicesResolver, QuotesService, QuotesResolver],
  exports: [SalesOrdersService, InvoicesService, QuotesService],
})
export class SalesModule {}
