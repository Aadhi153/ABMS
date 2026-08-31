import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
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
import { ROLE_LABELS } from "@abms/shared";
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

const ICON_BUTTON = "h-8 w-8 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-700";

/** Icons only — every page already renders its own heading, so a second
 * auto-generated title here was pure duplication (see Dashboard/CRM/etc). */
export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 sm:px-6">
      <Button variant="ghost" size="icon" aria-label="Open menu" onClick={onMenuClick} className={`${ICON_BUTTON} lg:hidden`}>
        <Menu className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme} className={ICON_BUTTON}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" aria-label="Notifications" className={ICON_BUTTON}>
        <Bell className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
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
