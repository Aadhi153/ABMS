import { Construction, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@abms/ui";

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 ease-out hover:scale-105 hover:rotate-3">
              <Construction className="h-5 w-5" />
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
          <Badge tone="warning" className="flex items-center gap-1 shrink-0">
            <Sparkles className="h-3 w-3" />
            Coming soon
          </Badge>
        </div>
        <CardDescription>Module scaffold — full CRUD and workflows land in a later build pass.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center animate-in fade-in duration-300 motion-reduce:animate-none">
          <Construction className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Nothing to configure here yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Routing, RBAC, and the app shell are already wired up for this module — real settings arrive in a later pass.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
