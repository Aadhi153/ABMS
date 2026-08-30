import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../providers/auth-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Used both as a layout route (renders matched nested route via Outlet) and as a
 * direct wrapper (pass `children`) for the root "/" dashboard case in RootRoute. */
export function AppShell({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Below `lg`, the sidebar renders as an off-canvas drawer — close it whenever
  // the route changes so navigating a link doesn't leave the drawer open.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  return (
    <div className="flex h-full min-h-screen items-stretch overflow-hidden">
      <Sidebar role={user.role} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
