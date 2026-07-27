import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { ContactsService } from "./contacts.service";
import { ContactModel } from "./models/contact.model";
import { CreateContactInput, UpdateContactInput } from "./dto/contact.input";

@Resolver(() => ContactModel)
@UseGuards(SessionAuthGuard, RolesGuard)
export class ContactsResolver {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [ContactModel])
  contacts() {
    return this.contactsService.findAll();
  }

  @Query(() => ContactModel, { nullable: true })
  contact(@Args("id") id: string) {
    return this.contactsService.findById(id);
  }

  @Mutation(() => ContactModel)
  @Roles(Role.ADMIN, Role.SALES)
  async createContact(@Args("input") input: CreateContactInput, @CurrentUser() actor: User) {
    const contact = await this.contactsService.create(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "Contact", contact.id, contact);
    return contact;
  }

  @Mutation(() => ContactModel)
  @Roles(Role.ADMIN, Role.SALES)
  async updateContact(@Args("id") id: string, @Args("input") input: UpdateContactInput, @CurrentUser() actor: User) {
    const before = await this.contactsService.findById(id);
    const contact = await this.contactsService.update(id, input);
    await this.audit.logUpdate(actor, "Contact", id, before, contact);
    return contact;
  }

  @Mutation(() => Boolean)
  @Roles(Role.ADMIN, Role.SALES)
  async deleteContact(@Args("id") id: string, @CurrentUser() actor: User) {
    const deleted = await this.contactsService.delete(id);
    await this.audit.logDelete(actor, "Contact", id, deleted);
    return true;
  }
}
