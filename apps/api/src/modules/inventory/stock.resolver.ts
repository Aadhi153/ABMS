import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { ProductModel } from "../products/models/product.model";
import { StockService } from "./stock.service";
import { StockLedgerEntryModel } from "./models/stock-ledger-entry.model";
import { StockTransferModel } from "./models/stock-transfer.model";
import { StockAdjustmentInput, StockMovementFilterInput, TransferStockInput } from "./dto/stock.input";

@Resolver()
@UseGuards(SessionAuthGuard, RolesGuard)
export class StockResolver {
  constructor(
    private readonly stockService: StockService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [ProductModel])
  lowStockProducts() {
    return this.stockService.lowStock();
  }

  @Query(() => [StockLedgerEntryModel])
  stockAdjustments() {
    return this.stockService.recentAdjustments();
  }

  @Query(() => [StockLedgerEntryModel])
  stockMovements(@Args("filter", { nullable: true }) filter?: StockMovementFilterInput) {
    return this.stockService.movements(filter);
  }

  @Query(() => [StockTransferModel])
  stockTransfers() {
    return this.stockService.transfers();
  }

  @Mutation(() => StockLedgerEntryModel)
  @Roles(Role.ADMIN, Role.WAREHOUSE, Role.PURCHASE)
  async adjustStock(@Args("input") input: StockAdjustmentInput, @CurrentUser() actor: User) {
    const entry = await this.stockService.adjustStock(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "StockLedgerEntry", entry.id, entry);
    return entry;
  }

  @Mutation(() => StockTransferModel)
  @Roles(Role.ADMIN, Role.WAREHOUSE, Role.PURCHASE)
  async transferStock(@Args("input") input: TransferStockInput, @CurrentUser() actor: User) {
    const transfer = await this.stockService.transferStock(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "StockTransfer", transfer.id, transfer);
    return transfer;
  }
}
