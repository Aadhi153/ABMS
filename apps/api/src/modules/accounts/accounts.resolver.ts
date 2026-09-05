import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { AccountsService } from "./accounts.service";
import { BankAccountModel, ExpenseModel, LedgerEntryModel, PayableModel, PnlModel, ReceivableModel } from "./models/accounts.model";
import { CreateExpenseInput } from "./dto/expense.input";

@Resolver()
@UseGuards(SessionAuthGuard, RolesGuard)
export class AccountsResolver {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [LedgerEntryModel])
  ledgerEntries() {
    return this.accountsService.ledger();
  }

  @Query(() => [BankAccountModel])
  bankAccounts() {
    return this.accountsService.bankAccounts();
  }

  @Query(() => [ReceivableModel])
  receivables() {
    return this.accountsService.receivables();
  }

  @Query(() => [PayableModel])
  payables() {
    return this.accountsService.payables();
  }

  @Query(() => [ExpenseModel])
  expenses() {
    return this.accountsService.expenses();
  }

  @Query(() => PnlModel)
  profitAndLoss() {
    return this.accountsService.pnl();
  }

  @Mutation(() => ExpenseModel)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  async createExpense(@Args("input") input: CreateExpenseInput, @CurrentUser() actor: User) {
    const expense = await this.accountsService.createExpense(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "Expense", expense.id, expense);
    return expense;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  async deleteExpense(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.accountsService.deleteExpense(id);
    await this.audit.logDelete(actor, "Expense", id, deleted);
    return true;
  }
}
