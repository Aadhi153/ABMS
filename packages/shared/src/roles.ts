export enum Role {
  ADMIN = "ADMIN",
  SALES = "SALES",
  WAREHOUSE = "WAREHOUSE",
  ACCOUNTANT = "ACCOUNTANT",
  PURCHASE = "PURCHASE",
}

export const ALL_ROLES = Object.values(Role);

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.SALES]: "Sales",
  [Role.WAREHOUSE]: "Warehouse",
  [Role.ACCOUNTANT]: "Accountant",
  [Role.PURCHASE]: "Purchase",
};

/** Which module each role lands on first after login — drives the role-aware dashboard. */
export const ROLE_HOME_MODULE: Record<Role, string> = {
  [Role.ADMIN]: "dashboard",
  [Role.SALES]: "crm",
  [Role.WAREHOUSE]: "inventory",
  [Role.ACCOUNTANT]: "accounts",
  [Role.PURCHASE]: "purchase",
};
