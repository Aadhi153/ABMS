import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  ChevronDown,
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

const HEADER_CLASS =
  "flex w-full items-center gap-3 rounded-lg px-3 py-[9px] text-sm font-normal text-sidebar-inactive transition-colors hover:bg-white/10 hover:text-white";
const LEAF_CLASS =
  "flex items-center gap-3 rounded-lg px-3 py-[9px] text-sm font-normal text-sidebar-inactive transition-colors hover:bg-white/10 hover:text-white";
const ACTIVE_CLASS = "bg-white/[0.22] font-semibold text-white";
const SUBITEM_ACTIVE_CLASS = "bg-white/[0.12] font-medium text-white";

export function Sidebar({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const items = NAV_MODULES.filter((m) => hasModuleAccess(role, m.id as ModuleKey));

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      items.filter((m) => m.children?.length).map((m) => [m.id, pathname.startsWith(m.path)]),
    ),
  );

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar-gradient px-[0.9rem] py-[1.2rem]">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-[16px] font-bold text-sidebar-logo">ABMS</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const hasChildren = !!item.children?.length;

          if (!hasChildren) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => cn(LEAF_CLASS, isActive && ACTIVE_CLASS)}
              >
                {Icon && <Icon className="h-[17px] w-[17px]" />}
                {item.label}
              </NavLink>
            );
          }

          const isActiveSection = pathname.startsWith(item.path);
          const isOpen = !!expanded[item.id];

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                className={cn(HEADER_CLASS, isActiveSection && !isOpen && ACTIVE_CLASS)}
              >
                {Icon && <Icon className="h-[17px] w-[17px]" />}
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-white/15 pl-3">
                  {item.children!.map((child) => (
                    <NavLink
                      key={child.id}
                      to={child.path}
                      className={({ isActive }) =>
                        cn(
                          "block rounded-lg px-3 py-[7px] text-sm font-normal text-sidebar-inactive transition-colors hover:bg-white/10 hover:text-white",
                          isActive && SUBITEM_ACTIVE_CLASS,
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
