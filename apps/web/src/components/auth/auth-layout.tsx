import type { ReactNode } from "react";
import { AuthLogo } from "./auth-logo";

interface AuthLayoutProps {
  title: string;
  description: string;
  stepIndicator?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Shared split-screen shell for the sign-in / create-organization / create-admin
 * screens — form on the left, branded panel on the right (hidden below `lg` so
 * the flow still works cleanly on mobile widths).
 */
export function AuthLayout({ title, description, stepIndicator, footer, children }: AuthLayoutProps) {
  return (
    <div className="auth-theme flex min-h-dvh min-h-screen bg-background">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-3">
            <AuthLogo />
            <span className="text-lg font-bold tracking-tight text-foreground">ABMS</span>
          </div>

          <div className="mt-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {stepIndicator && <div className="mt-6">{stepIndicator}</div>}

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>

        <p className="mx-auto mt-16 w-full max-w-sm text-xs text-muted-foreground/70">© 2026 ABMS. All rights reserved.</p>
      </div>

      <div className="relative hidden w-1/2 overflow-hidden bg-[linear-gradient(160deg,#25456d,#101f33)] lg:flex lg:flex-col lg:justify-between lg:p-16">
        <BrandGraphic />
        <div className="relative z-10">
          <AuthLogo size="lg" />
          <p className="mt-10 max-w-sm text-3xl font-bold leading-tight text-white">Run your business on one console.</p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/70">
            Inventory, sales, purchase, accounts, and CRM — unified, audited, and built for growing teams.
          </p>
        </div>
        <p className="relative z-10 text-sm font-medium text-white/60">Trusted by growing businesses across Tamil Nadu</p>
      </div>
    </div>
  );
}

function BrandGraphic() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 400 400" fill="none">
      <circle cx="340" cy="50" r="110" stroke="white" strokeWidth="1" />
      <circle cx="340" cy="50" r="170" stroke="white" strokeWidth="1" />
      <rect x="40" y="260" width="24" height="80" rx="4" fill="white" />
      <rect x="80" y="220" width="24" height="120" rx="4" fill="white" />
      <rect x="120" y="180" width="24" height="160" rx="4" fill="white" />
      <rect x="160" y="240" width="24" height="100" rx="4" fill="white" />
    </svg>
  );
}
