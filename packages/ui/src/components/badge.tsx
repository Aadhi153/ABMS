import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { StatusTone } from "@abms/shared";
import { STATUS_TONE } from "@abms/shared";
import { cn } from "../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      success: "bg-success-bg text-success",
      warning: "bg-warning-bg text-warning",
      danger: "bg-danger-bg text-danger",
      info: "bg-info-bg text-info",
      muted: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "muted",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}

/** Renders a status pill for any known enum value (e.g. "WON", "OVERDUE"), colored via STATUS_TONE. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone: StatusTone = STATUS_TONE[status] ?? "muted";
  return (
    <Badge tone={tone} className={className}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
