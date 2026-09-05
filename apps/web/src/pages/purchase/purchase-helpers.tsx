import { ChevronDown, ChevronUp, ChevronsUpDown, type LucideIcon } from "lucide-react";
import { Card, CardContent, cn } from "@abms/ui";
import { CARD_HOVER } from "../products/form-motion";

export function inr(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

export function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  k: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: string) => void;
  className?: string;
}) {
  const active = sortKey === k;
  return (
    <th className={cn("px-4 py-2.5 font-medium", className)}>
      <button className={cn("flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground", active && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
  );
}

export interface StatWidget {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  footer: string;
}

export function StatGrid({ widgets }: { widgets: StatWidget[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {widgets.map((w) => (
        <Card key={w.label} className={CARD_HOVER}>
          <CardContent className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <span className="text-xs font-medium text-muted-foreground">{w.label}</span>
              <w.icon className={cn("h-4 w-4", w.iconClass)} />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">{w.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{w.footer}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
