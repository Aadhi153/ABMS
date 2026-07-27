import { Inject, Injectable } from "@nestjs/common";
import { AuditAction } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../tenancy/scoped-prisma.service";

interface AuditActor {
  id: string;
  organizationId: string;
}

/**
 * Explicit audit logging, called from resolvers around create/update/delete
 * mutations. Kept as plain service calls (not a generic interceptor) so each
 * resolver controls exactly what "before"/"after" means for its entity.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(SCOPED_PRISMA) private readonly prisma: ScopedPrismaClient) {}

  logCreate(actor: AuditActor, entityType: string, entityId: string, after: unknown) {
    return this.write(actor, AuditAction.CREATE, entityType, entityId, null, after);
  }

  logUpdate(actor: AuditActor, entityType: string, entityId: string, before: unknown, after: unknown) {
    return this.write(actor, AuditAction.UPDATE, entityType, entityId, before, after);
  }

  logDelete(actor: AuditActor, entityType: string, entityId: string, before: unknown) {
    return this.write(actor, AuditAction.DELETE, entityType, entityId, before, null);
  }

  private write(
    actor: AuditActor,
    action: AuditAction,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.id,
        action,
        entityType,
        entityId,
        before: before === null || before === undefined ? undefined : JSON.parse(JSON.stringify(before)),
        after: after === null || after === undefined ? undefined : JSON.parse(JSON.stringify(after)),
      },
    });
  }
}
