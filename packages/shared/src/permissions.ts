import { Role } from "./roles";

/** Module keys — must match apps/api/src/modules/<key> and apps/web/src/pages/<key>. */
export type ModuleKey =
  | "dashboard"
  | "crm"
  | "inventory"
  | "sales"
  | "purchase"
  | "customers"
  | "suppliers"
  | "accounts"
  | "reports"
  | "settings";

export type PermissionAction = "read" | "create" | "update" | "delete";

/** Default RBAC matrix. Admin always has full access (enforced in the RBAC guard, not listed here). */
export const ROLE_MODULE_ACCESS: Record<Exclude<Role, Role.ADMIN>, ModuleKey[]> = {
  [Role.SALES]: ["dashboard", "crm", "inventory", "sales", "customers", "reports"],
  [Role.WAREHOUSE]: ["dashboard", "inventory", "reports"],
  [Role.ACCOUNTANT]: ["dashboard", "accounts", "customers", "suppliers", "reports"],
  [Role.PURCHASE]: ["dashboard", "purchase", "inventory", "suppliers", "reports"],
};

export function hasModuleAccess(role: Role, module: ModuleKey): boolean {
  if (role === Role.ADMIN) return true;
  return ROLE_MODULE_ACCESS[role]?.includes(module) ?? false;
}
