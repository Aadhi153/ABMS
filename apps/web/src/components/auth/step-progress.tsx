import { cn } from "@abms/ui";

interface StepProgressProps {
  step: 1 | 2;
}

const STEPS = [
  { n: 1 as const, label: "Organization" },
  { n: 2 as const, label: "Admin account" },
];

/** 2-step progress bar for the org creation wizard, with labels so users know what's next. */
export function StepProgress({ step }: StepProgressProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold">
        {STEPS.map((s) => (
          <span
            key={s.n}
            className={cn("transition-colors", step >= s.n ? "text-[hsl(var(--auth-primary))]" : "text-muted-foreground")}
          >
            {s.n}. {s.label}
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {STEPS.map((s) => (
          <span
            key={s.n}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", step >= s.n ? "bg-[hsl(var(--auth-primary))]" : "bg-border")}
          />
        ))}
      </div>
    </div>
  );
}
