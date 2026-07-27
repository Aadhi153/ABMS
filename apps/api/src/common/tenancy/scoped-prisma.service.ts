import { PrismaService } from "../prisma/prisma.service";
import { TenantContextService } from "./tenant-context";
import { tenantScopedExtension } from "./tenant-scoped.extension";

/** DI token for the tenant-scoped Prisma client (see ScopedPrismaClient). */
export const SCOPED_PRISMA = "SCOPED_PRISMA";

export function createScopedPrismaClient(prisma: PrismaService, tenantContext: TenantContextService) {
  return prisma.$extends(tenantScopedExtension(tenantContext));
}

/**
 * Tenant-scoped Prisma client type — same API as PrismaService, but every
 * query against a model in TENANT_SCOPED_MODELS is auto-filtered/stamped with
 * the current request's organizationId (see tenant-scoped.extension.ts).
 * Inject with `@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient`.
 */
export type ScopedPrismaClient = ReturnType<typeof createScopedPrismaClient>;
