import { Outlet } from "react-router-dom";
import { useAuth } from "../../providers/auth-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex h-screen items-stretch">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
