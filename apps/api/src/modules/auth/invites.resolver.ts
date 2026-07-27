import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@abms/database";
import { Role } from "@abms/shared";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { InvitesService } from "./invites.service";
import { InviteTokenModel } from "./models/invite-token.model";
import { InviteUserInput } from "./dto/invite-user.input";

@Resolver(() => InviteTokenModel)
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class InvitesResolver {
  constructor(
    private readonly invitesService: InvitesService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => [InviteTokenModel])
  pendingInvites() {
    return this.invitesService.pending();
  }

  @Mutation(() => InviteTokenModel)
  async inviteUser(@Args("input") input: InviteUserInput, @CurrentUser() actor: User) {
    const invite = await this.invitesService.invite(input, actor.id, actor.organizationId);
    await this.audit.logCreate(actor, "InviteToken", invite.id, { email: invite.email, role: invite.role });
    return invite;
  }

  @Mutation(() => InviteTokenModel)
  async resendInvite(@Args("id") id: string, @CurrentUser() actor: User) {
    const invite = await this.invitesService.resend(id);
    await this.audit.logUpdate(actor, "InviteToken", id, null, invite);
    return invite;
  }

  @Mutation(() => Boolean)
  async revokeInvite(@Args("id") id: string, @CurrentUser() actor: User) {
    await this.invitesService.revoke(id);
    await this.audit.logUpdate(actor, "InviteToken", id, null, { revoked: true });
    return true;
  }
}
