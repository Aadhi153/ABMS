import { useAuth } from "../providers/auth-provider";
import { AppShell } from "../components/layout/app-shell";
import DashboardPage from "../pages/dashboard";
import LandingPage from "../pages/landing";

/**
 * "/" serves two different things depending on auth state: the marketing
 * landing page for anonymous visitors, the dashboard (inside the normal app
 * shell) for signed-in users. Kept as its own route rather than folded into
 * ProtectedRoute since every other protected path should still bounce
 * anonymous visitors to /login, not the landing page.
 */
export function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-full min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return <LandingPage />;
  }
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}
