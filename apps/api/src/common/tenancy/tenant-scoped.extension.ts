import { ForbiddenException } from "@nestjs/common";
import { Prisma } from "@abms/database";
import type { TenantContextService } from "./tenant-context";

/**
 * Models that carry organizationId and must always be filtered/stamped by the
 * current tenant. Kept as an explicit allowlist (rather than "everything") so
 * Organization itself, PasswordResetToken (no organizationId column — looked
 * up by raw token before any session exists, via the unscoped PrismaService),
 * Session (scoped transitively via userId), and pure child/line-item tables
 * (SalesOrderItem, PurchaseOrderItem, GoodsReceivedNoteItem, PriceListItem —
 * reached only through an already-scoped parent) are never silently
 * auto-filtered. InviteToken IS included: its authenticated admin operations
 * (InvitesService) go through ScopedPrismaClient like everything else, while
 * AuthService's raw-token lookups (inviteInfo/acceptInvite) use the unscoped
 * PrismaService directly and so bypass this extension entirely.
 */
const TENANT_SCOPED_MODELS = new Set([
  "User",
  "InviteToken",
  "Contact",
  "Company",
  "Deal",
  "Task",
  "Activity",
  "Product",
  "Warehouse",
  "StockLevel",
  "StockLedgerEntry",
  "Customer",
  "Supplier",
  "SalesOrder",
  "Invoice",
  "Payment",
  "CreditNote",
  "PurchaseOrder",
  "GoodsReceivedNote",
  "SupplierBill",
  "LedgerEntry",
  "Expense",
  "OrgSettings",
  "TaxRate",
  "PriceList",
  "DocumentTemplate",
  "BankAccount",
  "ApprovalRule",
  "Approval",
  "AuditLog",
  "Notification",
]);

/// Reads/writes that take a `where` — merge organizationId in as an extra filter.
/// (Prisma's "extended where unique" support means this is safe for findUnique
/// too: an extra non-unique field alongside the unique key filters correctly
/// and returns null on mismatch, rather than throwing — verified against this
/// schema before relying on it here.)
const WHERE_SCOPED_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

function assertNoOrgOverride(data: unknown, organizationId: string, model: string) {
  if (data && typeof data === "object" && "organizationId" in data) {
    const requested = (data as { organizationId?: unknown }).organizationId;
    if (requested !== undefined && requested !== organizationId) {
      throw new ForbiddenException(`Cannot set ${model}.organizationId to a different organization`);
    }
  }
}

function stampCreateData(data: unknown, organizationId: string, model: string) {
  assertNoOrgOverride(data, organizationId, model);
  return { ...(data as Record<string, unknown>), organizationId };
}

export function tenantScopedExtension(tenantContext: TenantContextService) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: "tenant-scoped",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!model || !TENANT_SCOPED_MODELS.has(model)) {
              return query(args);
            }

            const ctx = tenantContext.get();
            if (!ctx) {
              throw new ForbiddenException(`No tenant context for ${model}.${operation}`);
            }
            const { organizationId } = ctx;
            const a = args as Record<string, unknown>;

            if (WHERE_SCOPED_OPERATIONS.has(operation)) {
              if (operation === "update" || operation === "updateMany") {
                assertNoOrgOverride(a.data, organizationId, model);
              }
              a.where = { ...(a.where as Record<string, unknown> | undefined), organizationId };
            } else if (operation === "create") {
              a.data = stampCreateData(a.data, organizationId, model);
            } else if (operation === "createMany") {
              a.data = Array.isArray(a.data)
                ? a.data.map((row) => stampCreateData(row, organizationId, model))
                : a.data;
            } else if (operation === "upsert") {
              a.where = { ...(a.where as Record<string, unknown> | undefined), organizationId };
              a.create = stampCreateData(a.create, organizationId, model);
              assertNoOrgOverride(a.update, organizationId, model);
            }

            return query(args);
          },
        },
      },
    }),
  );
}
