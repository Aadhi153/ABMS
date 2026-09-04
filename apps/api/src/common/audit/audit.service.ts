import { Inject, Injectable } from "@nestjs/common";
import { AuditAction } from "@abms/database";
import { SCOPED_PRISMA, type ScopedPrismaClient } from "../tenancy/scoped-prisma.service";

interface AuditActor {
  id: string;
  organizationId: string;
}

export interface FindMineOptions {
  limit: number;
  offset?: number;
  action?: AuditAction;
  from?: Date;
  to?: Date;
}

/** Checked in priority order against the create/update payload to derive a human label. */
const NAME_FIELDS = [
  "name",
  "title",
  "companyName",
  "orderNumber",
  "invoiceNumber",
  "poNumber",
  "quoteNumber",
  "grnNumber",
  "billNumber",
  "sku",
  "email",
];

function extractEntityName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  for (const field of NAME_FIELDS) {
    const value = obj[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
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

  async findMine(userId: string, opts: FindMineOptions) {
    const take = Math.min(opts.limit, 200);
    const where = {
      userId,
      ...(opts.action ? { action: opts.action } : {}),
      ...(opts.from || opts.to
        ? { createdAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
        : {}),
    };
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      skip: opts.offset ?? 0,
    });
    const hasMore = rows.length > take;
    return { items: hasMore ? rows.slice(0, take) : rows, hasMore };
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
        entityName: extractEntityName(after) ?? extractEntityName(before),
        before: before === null || before === undefined ? undefined : JSON.parse(JSON.stringify(before)),
        after: after === null || after === undefined ? undefined : JSON.parse(JSON.stringify(after)),
      },
    });
  }
}
