import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Role } from "@abms/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";

/** Runs after SessionAuthGuard. Admin always passes; otherwise user.role must be in @Roles(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!allowed || allowed.length === 0) return true;

    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    const userRole: string | undefined = req.user?.role;

    if (userRole === Role.ADMIN) return true;
    if (userRole && allowed.map(String).includes(userRole)) return true;

    throw new ForbiddenException("You do not have access to this resource");
  }
}
