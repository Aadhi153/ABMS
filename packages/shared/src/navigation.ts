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
    id: "products",
    label: "Products",
    path: "/products",
    icon: "Package",
    roles: [Role.ADMIN, Role.SALES, Role.PURCHASE],
    children: [
      { id: "all", label: "All Products", path: "/products/all" },
      { id: "categories", label: "All Categories", path: "/products/categories" },
      { id: "brands", label: "All Brands", path: "/products/brands" },
      { id: "pricelist", label: "Price List", path: "/products/pricelist" },
      { id: "pricingtiers", label: "Pricing Tiers", path: "/products/pricingtiers" },
      { id: "discounts", label: "Discounts", path: "/products/discounts" },
      { id: "taxrates", label: "Tax Rates", path: "/products/taxrates" },
      { id: "taxgroups", label: "Tax Groups", path: "/products/taxgroups" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory",
    icon: "Boxes",
    roles: [Role.ADMIN, Role.WAREHOUSE, Role.PURCHASE],
    children: [
      { id: "levels", label: "Stock Levels", path: "/inventory/levels" },
      { id: "movements", label: "Stock Movements", path: "/inventory/movements" },
      { id: "adjustments", label: "Stock Adjustments", path: "/inventory/adjustments" },
      { id: "alerts", label: "Stock Alerts", path: "/inventory/alerts" },
      { id: "transfers", label: "Stock Transfers", path: "/inventory/transfers" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    path: "/sales",
    icon: "ShoppingCart",
    roles: [Role.ADMIN, Role.SALES],
    children: [
      { id: "quotes", label: "Sales Quotes", path: "/sales/quotes" },
      { id: "orders", label: "Sales Orders", path: "/sales/orders" },
      { id: "invoices", label: "Sales Invoices", path: "/sales/invoices" },
      { id: "collections", label: "Customer Collections", path: "/sales/collections" },
      { id: "returns", label: "Credit Notes", path: "/sales/returns" },
      { id: "outstanding", label: "Sales Outstanding", path: "/sales/outstanding" },
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
    id: "hrms",
    label: "HRMS",
    path: "/hrms",
    icon: "Briefcase",
    roles: [Role.ADMIN],
    children: [
      { id: "employees", label: "Employees", path: "/hrms/employees" },
      { id: "attendance", label: "Attendance", path: "/hrms/attendance" },
      { id: "leave", label: "Leave", path: "/hrms/leave" },
      { id: "payroll", label: "Payroll", path: "/hrms/payroll" },
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
  },
];
