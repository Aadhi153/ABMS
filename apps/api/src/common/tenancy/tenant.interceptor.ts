import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Observable } from "rxjs";
import { TenantContextService } from "./tenant-context";

/**
 * Populates TenantContextService from req.user for every request. Runs after
 * SessionAuthGuard (Nest always runs guards before interceptors), so req.user
 * is already set for guarded resolvers. Public mutations (login, signup,
 * acceptInvite, requestPasswordReset, resetPassword, inviteInfo, me, logout)
 * have no req.user — those run with no tenant context, which is safe because
 * they never touch ScopedPrismaService.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    const user = req?.user;

    if (!user) {
      return next.handle();
    }

    return this.tenantContext.run(
      { organizationId: user.organizationId, userId: user.id, role: user.role },
      () => next.handle(),
    );
  }
}
