import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";
import {
  LayoutDashboard,
  Users,
  Boxes,
  Package,
  ShoppingCart,
  Truck,
  Contact,
  Factory,
  Landmark,
  Briefcase,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronsLeft,
  Building2,
  Globe,
  LogOut,
  Monitor,
  Moon,
  MoreHorizontal,
  Sun,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { NAV_MODULES, hasModuleAccess, type ModuleKey, type Role } from "@abms/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  cn,
} from "@abms/ui";
import { useAuth } from "../../providers/auth-provider";
import { useTheme } from "../../providers/theme-provider";
import { SUPPORTED_LANGUAGES, useLanguage } from "../../providers/language-provider";

const SIDEBAR_ORG_QUERY = gql`
  query SidebarOrgSettings {
    orgSettings {
      companyName
    }
  }
`;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Boxes,
  Package,
  ShoppingCart,
  Truck,
  Contact,
  Factory,
  Landmark,
  Briefcase,
  BarChart3,
  Settings,
};

const COLLAPSED_KEY = "abms-sidebar-collapsed";

const HEADER_CLASS =
  "flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3 py-[9px] text-sm font-normal text-sidebar-inactive transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-white/10 hover:text-white";
const LEAF_CLASS =
  "flex items-center gap-3 rounded-lg border-l-[3px] border-transparent px-3 py-[9px] text-sm font-normal text-sidebar-inactive transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-white/10 hover:text-white";
const ACTIVE_CLASS = "border-l-primary bg-white/[0.22] font-semibold text-white";
const SUBITEM_CLASS =
  "block rounded-lg px-3 py-[7px] text-sm font-normal text-sidebar-inactive transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-white/10 hover:text-white";
const SUBITEM_ACTIVE_CLASS = "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground";

export function Sidebar({
  role,
  mobileOpen,
  onClose,
}: {
  role: Role;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, preference, setPreference } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { data: orgData } = useQuery<{ orgSettings: { companyName: string } }>(SIDEBAR_ORG_QUERY);
  const items = NAV_MODULES.filter((m) => hasModuleAccess(role, m.id as ModuleKey));

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "true");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      items.filter((m) => m.children?.length).map((m) => [m.id, pathname.startsWith(m.path)]),
    ),
  );

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full shrink-0 flex-col overflow-hidden bg-sidebar-gradient py-[1.2rem] transition-[transform,width,padding] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[68px] px-2" : "w-52 px-[0.8rem]",
        )}
      >
        <div className={cn("mb-6 flex items-center transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]", collapsed ? "flex-col gap-2" : "justify-between gap-2")}>
          <div className={cn("flex items-center transition-[gap] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]", collapsed ? "justify-center gap-0" : "gap-2")}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[13px] font-bold text-sidebar-logo">
              A
            </span>
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap text-[16px] font-bold text-sidebar-logo transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
                collapsed ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100",
              )}
            >
              ABMS
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden rounded-md p-1 text-sidebar-inactive hover:bg-white/10 hover:text-white lg:flex lg:items-center lg:justify-center"
            >
              <ChevronsLeft
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
                  collapsed && "rotate-180",
                )}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-md p-1 text-sidebar-inactive hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="scrollbar-hide min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const hasChildren = !!item.children?.length && !collapsed;

            if (!hasChildren) {
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === "/"}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(LEAF_CLASS, collapsed && "justify-center gap-0 px-0", isActive && ACTIVE_CLASS)
                  }
                >
                  {Icon && <Icon className="h-[17px] w-[17px] shrink-0" />}
                  <span
                    className={cn(
                      "overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
                      collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100",
                    )}
                  >
                    {item.label}
                  </span>
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
                  {Icon && <Icon className="h-[17px] w-[17px] shrink-0" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-[22px] mt-0.5 space-y-0.5 border-l border-white/15 pl-3 pb-0.5">
                      {item.children!.map((child) => (
                        <NavLink
                          key={child.id}
                          to={child.path}
                          className={({ isActive }) => cn(SUBITEM_CLASS, isActive && SUBITEM_ACTIVE_CLASS)}
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-2 border-t border-white/10 pt-3">
          {orgData?.orgSettings?.companyName && (
            <div
              className={cn(
                "overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
                collapsed ? "mb-0 max-h-0 opacity-0" : "mb-2 max-h-6 opacity-100",
              )}
            >
              <div className="flex items-center gap-1.5 px-1.5 text-[11px] font-medium uppercase tracking-wide text-sidebar-inactive/80">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{orgData.orgSettings.companyName}</span>
              </div>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center rounded-lg p-1.5 text-left outline-none transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] hover:bg-white/10 focus-visible:bg-white/10 motion-reduce:transition-none",
                  collapsed ? "justify-center gap-0" : "gap-2",
                )}
              >
                <Avatar className="h-8 w-8 shrink-0 bg-white/10">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                    {user ? initials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
                    collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                    <p className="truncate text-xs text-sidebar-inactive">{user?.email}</p>
                  </div>
                  <MoreHorizontal className="h-4 w-4 shrink-0 text-sidebar-inactive" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={preference} onValueChange={(v) => setPreference(v as typeof preference)}>
                    <DropdownMenuRadioItem value="light">
                      <Sun className="mr-2 inline h-4 w-4" />
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <Moon className="mr-2 inline h-4 w-4" />
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <Monitor className="mr-2 inline h-4 w-4" />
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Globe className="h-4 w-4" />
                  Select Language
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => void logout()}>
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
