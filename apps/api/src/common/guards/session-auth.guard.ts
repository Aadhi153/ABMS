import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { SESSION_COOKIE_NAME, SessionService } from "../session/session.service";

/** Requires a valid session cookie. Attaches the resolved user to req.user for @CurrentUser(). */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    const sessionId: string | undefined = req.signedCookies?.[SESSION_COOKIE_NAME];
    const user = await this.sessions.getUserFromSessionId(sessionId);
    if (!user) {
      throw new UnauthorizedException("Not authenticated");
    }
    req.user = user;
    return true;
  }
}
