import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
}

/**
 * Request-scoped tenant context, populated by TenantContextInterceptor from the
 * authenticated user's session and read by the tenant-scoped Prisma extension.
 * Absent (undefined) for unauthenticated flows (login/signup/invite/reset).
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  get(): TenantContext | undefined {
    return this.storage.getStore();
  }
}
