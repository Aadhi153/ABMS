import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as crypto from "node:crypto";
import type { Response } from "express";
import { Role } from "@abms/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SessionService } from "../../common/session/session.service";
import { MailerService } from "../../common/mailer/mailer.service";
import { UsersService } from "../users/users.service";
import type { SignupInput } from "./dto/signup.input";
import type { AcceptInviteInput } from "./dto/accept-invite.input";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * signup/acceptInvite/requestPasswordReset/resetPassword all use the raw
 * (unscoped) PrismaService, not ScopedPrismaClient: none of them run inside an
 * authenticated session, so there is no tenant context for the auto-scoping
 * extension to read yet. organizationId is assigned explicitly instead —
 * from a freshly created Organization (signup) or from the resolved invite
 * (acceptInvite).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async login(email: string, password: string, res: Response) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.active) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const session = await this.sessions.createSession(user.id);
    this.sessions.setCookie(res, session.id);
    return user;
  }

  async logout(sessionId: string | undefined, res: Response) {
    if (sessionId) {
      await this.sessions.destroySession(sessionId);
    }
    this.sessions.clearCookie(res);
    return true;
  }

  async signup(input: SignupInput, res: Response) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException("A user with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: input.organizationName } });
      await tx.orgSettings.create({ data: { organizationId: org.id, companyName: input.organizationName } });
      return tx.user.create({
        data: {
          email: input.email,
          name: input.fullName,
          passwordHash,
          role: Role.ADMIN,
          organizationId: org.id,
        },
      });
    });

    const session = await this.sessions.createSession(user.id);
    this.sessions.setCookie(res, session.id);
    return user;
  }

  async inviteInfo(token: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { organization: true },
    });
    if (!invite) {
      return { valid: false, expired: false, email: null, organizationName: null, role: null };
    }
    const expired = invite.expiresAt < new Date() || !!invite.revokedAt || !!invite.acceptedAt;
    return {
      valid: !expired,
      expired,
      email: invite.email,
      organizationName: invite.organization.name,
      role: invite.role,
    };
  }

  async acceptInvite(input: AcceptInviteInput, res: Response) {
    const invite = await this.prisma.inviteToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
    if (!invite || invite.revokedAt || invite.acceptedAt) {
      throw new BadRequestException("This invite link is invalid.");
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException("This invite has expired — ask your admin to send a new one.");
    }
    const existing = await this.users.findByEmail(invite.email);
    if (existing) throw new ConflictException("A user with this email already exists");

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invite.email,
          name: input.name,
          passwordHash,
          role: invite.role,
          organizationId: invite.organizationId,
        },
      });
      await tx.inviteToken.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
      return created;
    });

    const session = await this.sessions.createSession(user.id);
    this.sessions.setCookie(res, session.id);
    return user;
  }

  async requestPasswordReset(email: string) {
    const user = await this.users.findByEmail(email);
    if (user && user.active) {
      const token = generateToken();
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      });
      await this.mailer.sendPasswordReset(user.email, token);
    }
    // Always return true — anti-enumeration: don't reveal whether the email exists.
    return true;
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException("This reset link is invalid or has expired.");
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      this.prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);
    return true;
  }
}

export { INVITE_TTL_MS };
