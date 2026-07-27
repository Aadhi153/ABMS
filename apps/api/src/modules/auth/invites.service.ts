import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as crypto from "node:crypto";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../../common/tenancy/scoped-prisma.service";
import { MailerService } from "../../common/mailer/mailer.service";
import { UsersService } from "../users/users.service";
import type { InviteUserInput } from "./dto/invite-user.input";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class InvitesService {
  constructor(
    @Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient,
    private readonly users: UsersService,
    private readonly mailer: MailerService,
  ) {}

  pending() {
    return this.prisma.inviteToken.findMany({
      where: { acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async invite(input: InviteUserInput, actorId: string, organizationId: string) {
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) throw new ConflictException("A user with this email already exists");
    const existingInvite = await this.prisma.inviteToken.findFirst({
      where: { email: input.email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (existingInvite) throw new ConflictException("An invite is already pending for this email");

    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const token = generateToken();
    const invite = await this.prisma.inviteToken.create({
      data: {
        organizationId,
        email: input.email,
        role: input.role,
        tokenHash: hashToken(token),
        invitedById: actorId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
    await this.mailer.sendInvite(input.email, token, organization?.name ?? "your team", input.role);
    return invite;
  }

  async resend(id: string) {
    const invite = await this.prisma.inviteToken.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException("Invite not found");
    if (invite.acceptedAt) throw new BadRequestException("This invite was already accepted");

    const organization = await this.prisma.organization.findUnique({ where: { id: invite.organizationId } });
    const token = generateToken();
    const updated = await this.prisma.inviteToken.update({
      where: { id },
      data: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS), revokedAt: null },
    });
    await this.mailer.sendInvite(invite.email, token, organization?.name ?? "your team", invite.role);
    return updated;
  }

  async revoke(id: string) {
    const invite = await this.prisma.inviteToken.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException("Invite not found");
    return this.prisma.inviteToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}
