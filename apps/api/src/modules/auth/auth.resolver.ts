import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request, Response } from "express";
import { SESSION_COOKIE_NAME, SessionService } from "../../common/session/session.service";
import { UserModel } from "../users/models/user.model";
import { LoginInput } from "./dto/login.input";
import { SignupInput } from "./dto/signup.input";
import { AcceptInviteInput } from "./dto/accept-invite.input";
import { RequestPasswordResetInput } from "./dto/request-password-reset.input";
import { ResetPasswordInput } from "./dto/reset-password.input";
import { InviteInfoModel } from "./models/invite-info.model";
import { AuthService } from "./auth.service";

interface GqlContext {
  req: Request;
  res: Response;
}

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Query(() => UserModel, { nullable: true })
  async me(@Context() ctx: GqlContext) {
    const sessionId: string | undefined = ctx.req.signedCookies?.[SESSION_COOKIE_NAME];
    return this.sessions.getUserFromSessionId(sessionId);
  }

  @Mutation(() => UserModel)
  async login(@Args("input") input: LoginInput, @Context() ctx: GqlContext) {
    return this.authService.login(input.email, input.password, ctx.res);
  }

  @Mutation(() => Boolean)
  async logout(@Context() ctx: GqlContext) {
    const sessionId: string | undefined = ctx.req.signedCookies?.[SESSION_COOKIE_NAME];
    return this.authService.logout(sessionId, ctx.res);
  }

  @Mutation(() => UserModel)
  async signup(@Args("input") input: SignupInput, @Context() ctx: GqlContext) {
    return this.authService.signup(input, ctx.res);
  }

  @Query(() => InviteInfoModel)
  async inviteInfo(@Args("token") token: string) {
    return this.authService.inviteInfo(token);
  }

  @Mutation(() => UserModel)
  async acceptInvite(@Args("input") input: AcceptInviteInput, @Context() ctx: GqlContext) {
    return this.authService.acceptInvite(input, ctx.res);
  }

  @Mutation(() => Boolean)
  async requestPasswordReset(@Args("input") input: RequestPasswordResetInput) {
    return this.authService.requestPasswordReset(input.email);
  }

  @Mutation(() => Boolean)
  async resetPassword(@Args("input") input: ResetPasswordInput) {
    return this.authService.resetPassword(input.token, input.newPassword);
  }
}
