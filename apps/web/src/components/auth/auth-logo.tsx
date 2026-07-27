import { Building2 } from "lucide-react";

/**
 * Fixed brand mark for unauthenticated auth screens — navy gradient, not
 * theme-dependent (same precedent as the sidebar being a fixed dark surface
 * in both light and dark mode, see CLAUDE.md).
 */
export function AuthLogo() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(160deg,#1B3654,#3E6B96)]"
      aria-hidden="true"
    >
      <Building2 className="h-4 w-4 text-white" strokeWidth={2.25} />
    </div>
  );
}
