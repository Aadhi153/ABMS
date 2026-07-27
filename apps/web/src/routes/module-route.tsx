import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { hasModuleAccess, type ModuleKey } from "@abms/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@abms/ui";
import { useAuth } from "../providers/auth-provider";

/** Gates a module route by the current user's role, showing a 403 state instead of the page. */
export function ModuleRoute({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  if (!hasModuleAccess(user.role, module)) {
    return (
      <Card className="mx-auto mt-12 max-w-md">
        <CardHeader className="items-center text-center">
          <ShieldAlert className="mb-2 h-8 w-8 text-danger" />
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Your role does not have access to this module. Contact an administrator if you believe this is a mistake.
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
