interface AuthLogoProps {
  size?: "sm" | "lg";
}

const SIZE_STYLES: Record<NonNullable<AuthLogoProps["size"]>, string> = {
  sm: "h-9 w-9 rounded-xl text-sm",
  lg: "h-14 w-14 rounded-2xl text-2xl",
};

/**
 * Monogram brand mark for unauthenticated auth screens — deep navy gradient,
 * not theme-dependent (same precedent as the sidebar being a fixed dark
 * surface in both light and dark mode, see CLAUDE.md).
 */
export function AuthLogo({ size = "sm" }: AuthLogoProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-[linear-gradient(160deg,#2c4f7c,#101f33)] font-bold text-white shadow-sm ring-1 ring-inset ring-white/10 ${SIZE_STYLES[size]}`}
      aria-hidden="true"
    >
      A
    </div>
  );
}
