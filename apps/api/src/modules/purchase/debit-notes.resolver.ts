import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { DebitNotesService } from "./debit-notes.service";
import { DebitNoteModel } from "./models/debit-note.model";
import { CreateDebitNoteInput } from "./dto/debit-note.input";

@Resolver(() => DebitNoteModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class DebitNotesResolver {
  constructor(
    private readonly debitNotesService: DebitNotesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [DebitNoteModel])
  debitNotes() {
    return this.debitNotesService.findAll();
  }

  @Mutation(() => DebitNoteModel)
  @Roles(Role.ADMIN, Role.PURCHASE, Role.ACCOUNTANT)
  async createDebitNote(@Args("input") input: CreateDebitNoteInput, @CurrentUser() actor: User) {
    const debitNote = await this.debitNotesService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "DebitNote", debitNote.id, debitNote);
    return debitNote;
  }

  @Mutation(() => DebitNoteModel)
  @Roles(Role.ADMIN, Role.PURCHASE, Role.ACCOUNTANT)
  async voidDebitNote(@Args("id") id: string, @CurrentUser() actor: User) {
    const before = await this.debitNotesService.findById(id);
    const debitNote = await this.debitNotesService.void(id, actor.id, actor.organizationId);
    await this.audit.logUpdate(actor, "DebitNote", id, before, debitNote);
    return debitNote;
  }
}
