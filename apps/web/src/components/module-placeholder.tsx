import { Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@abms/ui";

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Construction className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>Module scaffold — full CRUD and workflows land in a later build pass.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Routing, RBAC, and the app shell are wired up for this module already.
      </CardContent>
    </Card>
  );
}
