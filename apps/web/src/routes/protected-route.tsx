import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@abms/ui";
import { useAuth } from "../providers/auth-provider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, unreachable } = useAuth();

  if (loading) {
    return <div className="flex h-full min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (unreachable) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-3 text-center">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Can't reach the server</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your session is fine — the API just didn't respond. This is usually the dev server restarting.
        </p>
        <Button size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
