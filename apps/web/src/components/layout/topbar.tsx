import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@abms/ui";
import { NAV_MODULES, ROLE_LABELS } from "@abms/shared";
import { useAuth } from "../../providers/auth-provider";
import { useTheme } from "../../providers/theme-provider";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function pageTitle(pathname: string) {
  const match = [...NAV_MODULES]
    .filter((m) => (m.path === "/" ? pathname === "/" : pathname.startsWith(m.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match?.label ?? "ABMS";
}

const ICON_BUTTON = "h-9 w-9 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-700";

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold text-foreground">{pageTitle(pathname)}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme} className={ICON_BUTTON}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className={ICON_BUTTON}>
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
              <Avatar className="bg-primary text-primary-foreground">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? initials(user.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start sm:flex">
                <span className="text-sm font-bold leading-tight text-foreground">{user?.name}</span>
                <span className="text-xs leading-tight text-muted-foreground">
                  {user ? ROLE_LABELS[user.role] : ""}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user ? ROLE_LABELS[user.role] : ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
