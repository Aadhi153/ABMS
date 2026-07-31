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
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar-gradient px-[0.9rem] py-[1.2rem]">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-[16px] font-bold text-sidebar-logo">ABMS</span>
      </div>
      <nav className="flex-1 space-y-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-[9px] text-sm font-normal text-sidebar-inactive transition-colors hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/[0.22] font-semibold text-white",
                )
              }
            >
              {Icon && <Icon className="h-[17px] w-[17px]" />}
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
