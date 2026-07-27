import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Boxes,
  ShoppingCart,
  Truck,
  Contact,
  Factory,
  Landmark,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { NAV_MODULES, hasModuleAccess, type ModuleKey, type Role } from "@abms/shared";
import { cn } from "@abms/ui";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Boxes,
  ShoppingCart,
  Truck,
  Contact,
  Factory,
  Landmark,
  BarChart3,
  Settings,
};

export function Sidebar({ role }: { role: Role }) {
  const items = NAV_MODULES.filter((m) => hasModuleAccess(role, m.id as ModuleKey));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar-gradient">
      <div className="flex h-16 items-center gap-2 px-5 text-lg font-semibold">
        <span className="text-sidebar-logo">ABMS</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-inactive transition-colors hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/[0.22] font-semibold text-white",
                )
              }
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
