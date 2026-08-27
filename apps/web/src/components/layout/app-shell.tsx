import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../providers/auth-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Used both as a layout route (renders matched nested route via Outlet) and as a
 * direct wrapper (pass `children`) for the root "/" dashboard case in RootRoute. */
export function AppShell({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex h-screen items-stretch">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
