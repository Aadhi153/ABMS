import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import type { User } from "@abms/database";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SESSION_COOKIE_NAME } from "../../common/session/session.service";
import { SessionsService } from "./sessions.service";
import { SessionModel } from "./models/session.model";

interface GqlContext {
  req: Request;
}

@Resolver(() => SessionModel)
@UseGuards(SessionAuthGuard)
export class SessionsResolver {
  constructor(private readonly sessionsService: SessionsService) {}

  @Query(() => [SessionModel])
  async mySessions(@CurrentUser() actor: User, @Context() ctx: GqlContext) {
    const currentId: string | undefined = ctx.req.signedCookies?.[SESSION_COOKIE_NAME];
    const sessions = await this.sessionsService.listForUser(actor.id);
    return sessions.map((s) => ({ ...s, isCurrent: s.id === currentId }));
  }

  @Mutation(() => Boolean)
  async revokeSession(@Args("id") id: string, @CurrentUser() actor: User) {
    await this.sessionsService.revoke(id, actor.id);
    return true;
  }

  @Mutation(() => Boolean)
  async revokeOtherSessions(@CurrentUser() actor: User, @Context() ctx: GqlContext) {
    const currentId: string | undefined = ctx.req.signedCookies?.[SESSION_COOKIE_NAME];
    await this.sessionsService.revokeOthers(actor.id, currentId);
    return true;
  }
}
