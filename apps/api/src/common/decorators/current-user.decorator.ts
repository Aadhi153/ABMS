import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { User } from "@abms/database";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
  const ctx = GqlExecutionContext.create(context);
  const req = ctx.getContext().req;
  return req.user;
});
