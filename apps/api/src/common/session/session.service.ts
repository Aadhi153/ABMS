import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { User } from "@abms/database";
import { PrismaService } from "../prisma/prisma.service";

export const SESSION_COOKIE_NAME = "abms_sid";

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private get timeoutMins(): number {
    const raw = Number(process.env.SESSION_TIMEOUT_MINS);
    return Number.isFinite(raw) && raw > 0 ? raw : 120;
  }

  async createSession(userId: string, meta?: { userAgent?: string; ipAddress?: string }) {
    const expiresAt = new Date(Date.now() + this.timeoutMins * 60_000);
    return this.prisma.session.create({
      data: { userId, expiresAt, userAgent: meta?.userAgent, ipAddress: meta?.ipAddress, lastActiveAt: new Date() },
    });
  }

  async destroySession(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async getUserFromSessionId(sessionId: string | undefined): Promise<User | null> {
    if (!sessionId) return null;
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    if (!session.user.active) return null;
    this.touch(session.id, session.lastActiveAt);
    return session.user;
  }

  /** Fire-and-forget, throttled to avoid a write on every single request. */
  private touch(sessionId: string, lastActiveAt: Date) {
    if (Date.now() - lastActiveAt.getTime() < 5 * 60_000) return;
    void this.prisma.session.update({ where: { id: sessionId }, data: { lastActiveAt: new Date() } }).catch(() => {});
  }

  setCookie(res: Response, sessionId: string) {
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: this.timeoutMins * 60_000,
    });
  }

  clearCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE_NAME);
  }
}
