import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request, Response } from "express";
import type { User } from "@abms/database";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuditService } from "../../common/audit/audit.service";
import { SESSION_COOKIE_NAME, SessionService } from "../../common/session/session.service";
import { UsersService } from "../users/users.service";
import { UserModel } from "../users/models/user.model";
import { LoginInput } from "./dto/login.input";
import { SignupInput } from "./dto/signup.input";
import { AcceptInviteInput } from "./dto/accept-invite.input";
import { RequestPasswordResetInput } from "./dto/request-password-reset.input";
import { ResetPasswordInput } from "./dto/reset-password.input";
import { UpdateProfileInput } from "./dto/update-profile.input";
import { ChangePasswordInput } from "./dto/change-password.input";
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
    private readonly usersService: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Query(() => UserModel, { nullable: true })
  async me(@Context() ctx: GqlContext) {
    const sessionId: string | undefined = ctx.req.signedCookies?.[SESSION_COOKIE_NAME];
    return this.sessions.getUserFromSessionId(sessionId);
  }

  @Mutation(() => UserModel)
  async login(@Args("input") input: LoginInput, @Context() ctx: GqlContext) {
    return this.authService.login(input.email, input.password, ctx.req, ctx.res);
  }

  @Mutation(() => Boolean)
  async logout(@Context() ctx: GqlContext) {
    const sessionId: string | undefined = ctx.req.signedCookies?.[SESSION_COOKIE_NAME];
    return this.authService.logout(sessionId, ctx.res);
  }

  @Mutation(() => UserModel)
  async signup(@Args("input") input: SignupInput, @Context() ctx: GqlContext) {
    return this.authService.signup(input, ctx.req, ctx.res);
  }

  @Query(() => InviteInfoModel)
  async inviteInfo(@Args("token") token: string) {
    return this.authService.inviteInfo(token);
  }

  @Mutation(() => UserModel)
  async acceptInvite(@Args("input") input: AcceptInviteInput, @Context() ctx: GqlContext) {
    return this.authService.acceptInvite(input, ctx.req, ctx.res);
  }

  @Mutation(() => Boolean)
  async requestPasswordReset(@Args("input") input: RequestPasswordResetInput) {
    return this.authService.requestPasswordReset(input.email);
  }

  @Mutation(() => Boolean)
  async resetPassword(@Args("input") input: ResetPasswordInput) {
    return this.authService.resetPassword(input.token, input.newPassword);
  }

  @Mutation(() => UserModel)
  @UseGuards(SessionAuthGuard)
  async updateMyProfile(@Args("input") input: UpdateProfileInput, @CurrentUser() actor: User) {
    const before = await this.usersService.findById(actor.id, actor.organizationId);
    const user = await this.usersService.update(actor.id, input, actor.organizationId);
    await this.audit.logUpdate(actor, "User", actor.id, before, user);
    return user;
  }

  @Mutation(() => Boolean)
  @UseGuards(SessionAuthGuard)
  async changeMyPassword(@Args("input") input: ChangePasswordInput, @CurrentUser() actor: User) {
    return this.authService.changeMyPassword(actor.id, input.currentPassword, input.newPassword);
  }
}
