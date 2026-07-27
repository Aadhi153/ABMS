import { Role } from "./roles";

export interface NavModule {
  id: string;
  label: string;
  path: string;
  icon: string;
  roles: Role[] | "all";
}

/** Sidebar nav — apps/web/src/pages/<id> and apps/api/src/modules/<id> mirror these ids. */
export const NAV_MODULES: NavModule[] = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: "LayoutDashboard", roles: "all" },
  { id: "crm", label: "CRM", path: "/crm", icon: "Users", roles: [Role.ADMIN, Role.SALES] },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    icon: "Boxes",
    roles: [Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.PURCHASE],
  },
  { id: "sales", label: "Sales", path: "/sales", icon: "ShoppingCart", roles: [Role.ADMIN, Role.SALES] },
  { id: "purchase", label: "Purchase", path: "/purchase", icon: "Truck", roles: [Role.ADMIN, Role.PURCHASE] },
  {
    id: "customers",
    label: "Customers",
    path: "/customers",
    icon: "Contact",
    roles: [Role.ADMIN, Role.SALES, Role.ACCOUNTANT],
  },
  {
    id: "suppliers",
    label: "Suppliers",
    path: "/suppliers",
    icon: "Factory",
    roles: [Role.ADMIN, Role.PURCHASE, Role.ACCOUNTANT],
  },
  { id: "accounts", label: "Accounts", path: "/accounts", icon: "Landmark", roles: [Role.ADMIN, Role.ACCOUNTANT] },
  { id: "reports", label: "Reports", path: "/reports", icon: "BarChart3", roles: "all" },
  { id: "settings", label: "Settings", path: "/settings", icon: "Settings", roles: [Role.ADMIN] },
];
