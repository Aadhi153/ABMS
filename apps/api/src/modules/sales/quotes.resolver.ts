import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { QuotesService } from "./quotes.service";
import { QuoteModel } from "./models/quote.model";
import { CreateQuoteInput } from "./dto/quote.input";

@Resolver(() => QuoteModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class QuotesResolver {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [QuoteModel])
  quotes() {
    return this.quotesService.findAll();
  }

  @Query(() => QuoteModel, { nullable: true })
  quote(@Args("id") id: string) {
    return this.quotesService.findById(id);
  }

  @Mutation(() => QuoteModel)
  @Roles(Role.ADMIN, Role.SALES)
  async createQuote(@Args("input") input: CreateQuoteInput, @CurrentUser() actor: User) {
    const quote = await this.quotesService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "Quote", quote.id, quote);
    return quote;
  }

  @Mutation(() => QuoteModel)
  @Roles(Role.ADMIN, Role.SALES)
  async updateQuote(@Args("id") id: string, @Args("input") input: CreateQuoteInput, @CurrentUser() actor: User) {
    const before = await this.quotesService.findById(id);
    const quote = await this.quotesService.update(id, input);
    await this.audit.logUpdate(actor, "Quote", id, before, quote);
    return quote;
  }

  @Mutation(() => QuoteModel)
  @Roles(Role.ADMIN, Role.SALES)
  async sendQuote(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.quotesService.findById(id);
    const quote = await this.quotesService.send(id);
    await this.audit.logUpdate(actor, "Quote", id, before, quote);
    return quote;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES)
  async deleteQuote(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.quotesService.delete(id);
    await this.audit.logDelete(actor, "Quote", id, deleted);
    return true;
  }
}
