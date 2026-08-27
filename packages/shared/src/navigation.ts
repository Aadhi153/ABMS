import { Role } from "./roles";

export interface NavSubItem {
  id: string;
  label: string;
  path: string;
}

export interface NavModule {
  id: string;
  label: string;
  path: string;
  icon: string;
  roles: Role[] | "all";
  /** v1 sidebar sub-items. Omitted (or empty) modules render as a direct link, not an accordion. */
  children?: NavSubItem[];
}

/** Sidebar nav — apps/web/src/pages/<id> and apps/api/src/modules/<id> mirror these ids. */
export const NAV_MODULES: NavModule[] = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: "LayoutDashboard", roles: "all" },
  {
    id: "crm",
    label: "CRM",
    path: "/crm",
    icon: "Users",
    roles: [Role.ADMIN, Role.SALES],
    children: [
      { id: "contacts", label: "Contacts", path: "/crm/contacts" },
      { id: "companies", label: "Companies", path: "/crm/companies" },
      { id: "deals", label: "Deals / Pipeline", path: "/crm/deals" },
      { id: "tasks", label: "Tasks", path: "/crm/tasks" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    icon: "Boxes",
    roles: [Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.PURCHASE],
    children: [
      { id: "products", label: "Products", path: "/inventory/products" },
      { id: "warehouses", label: "Warehouses", path: "/inventory/warehouses" },
      { id: "adjustments", label: "Stock Adjustments", path: "/inventory/adjustments" },
      { id: "lowstock", label: "Low Stock", path: "/inventory/lowstock" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    path: "/sales",
    icon: "ShoppingCart",
    roles: [Role.ADMIN, Role.SALES],
    children: [
      { id: "quotes", label: "Quotes", path: "/sales/quotes" },
      { id: "orders", label: "Sales Orders", path: "/sales/orders" },
      { id: "invoices", label: "Invoices", path: "/sales/invoices" },
      { id: "returns", label: "Returns / Credit Notes", path: "/sales/returns" },
    ],
  },
  {
    id: "purchase",
    label: "Purchase",
    path: "/purchase",
    icon: "Truck",
    roles: [Role.ADMIN, Role.PURCHASE],
    children: [
      { id: "requisitions", label: "Purchase Requisitions", path: "/purchase/requisitions" },
      { id: "orders", label: "Purchase Orders", path: "/purchase/orders" },
      { id: "receipts", label: "Goods Received Notes", path: "/purchase/receipts" },
      { id: "bills", label: "Purchase Invoices / Supplier Bills", path: "/purchase/bills" },
      { id: "debitnotes", label: "Debit Notes", path: "/purchase/debitnotes" },
    ],
  },
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
  {
    id: "accounts",
    label: "Accounts",
    path: "/accounts",
    icon: "Landmark",
    roles: [Role.ADMIN, Role.ACCOUNTANT],
    children: [
      { id: "ledger", label: "Ledger", path: "/accounts/ledger" },
      { id: "receivables", label: "Receivables", path: "/accounts/receivables" },
      { id: "payables", label: "Payables", path: "/accounts/payables" },
      { id: "expenses", label: "Expenses", path: "/accounts/expenses" },
      { id: "pnl", label: "P&L Statement", path: "/accounts/pnl" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    path: "/reports",
    icon: "BarChart3",
    roles: "all",
    children: [
      { id: "sales", label: "Sales Reports", path: "/reports/sales" },
      { id: "inventory", label: "Inventory Reports", path: "/reports/inventory" },
      { id: "purchase", label: "Purchase Reports", path: "/reports/purchase" },
      { id: "financial", label: "Financial Reports", path: "/reports/financial" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    path: "/settings",
    icon: "Settings",
    roles: [Role.ADMIN],
    children: [
      { id: "org", label: "Organization Settings", path: "/settings/org" },
      { id: "users", label: "Users & Teams", path: "/settings/users" },
      { id: "permissions", label: "Roles & Permissions", path: "/settings/permissions" },
      { id: "warehouses", label: "Warehouses config", path: "/settings/warehouses" },
      { id: "tax", label: "Tax Configuration", path: "/settings/tax" },
      { id: "bankaccounts", label: "Bank Accounts", path: "/settings/bankaccounts" },
      { id: "notifications", label: "Notifications", path: "/settings/notifications" },
      { id: "security", label: "Security", path: "/settings/security" },
    ],
  },
];
