import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, Loader2, Plus } from "lucide-react";
import {
  Button,
  Card,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@abms/ui";
import { usePageFooterSlot } from "../../providers/page-footer-slot";
import { BUTTON_PRESS, FORM_ENTER, FORM_EXIT, sectionMotion, usePageTransition } from "./form-motion";

/** Content column width shared by the scroll area and the footer's button row, so the
 * footer's buttons stay aligned under the form cards above them. */
const FORM_MAX_WIDTH = "max-w-5xl";

/** No scroll container of its own — flows straight inside AppShell's <main>, the exact
 * same single scrollbar every other products page (e.g. All Products) scrolls on.
 * FormFooter doesn't live in this tree at all (see its own comment): it portals into a
 * slot AppShell renders below <main>, which is what lets this stay a plain flow div
 * instead of needing its own nested scroll box to keep the footer from overlapping content.
 * `leaving` (from useDiscardGuard) swaps the entrance animation for its mirrored exit so the
 * page slides back out the way it came in before the route actually changes. */
export function FormPage({ children, leaving }: { children: ReactNode; leaving?: boolean }) {
  return (
    <div className={cn(leaving ? FORM_EXIT : FORM_ENTER)}>
      {children}
    </div>
  );
}

/** The form's content column. Horizontal/top gutter comes from AppShell's <main> (p-4
 * sm:p-6) alone — this used to add its own matching px/pt on top of that, doubling the
 * gutter for every FormPage-based route relative to the plain list-tab pages. */
export function FormScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className={cn("mx-auto space-y-6", FORM_MAX_WIDTH)}>
      {children}
    </div>
  );
}

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function FormBreadcrumb({
  items,
  onNavigate,
}: {
  items: BreadcrumbItem[];
  /** Routes clicks through a form's discard guard instead of navigating immediately.
   * Falls back to a plain navigate for breadcrumbs used outside a guarded form. */
  onNavigate?: (to: string) => void;
}) {
  const navigate = useNavigate();
  const go = onNavigate ?? navigate;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
    >
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {item.to ? (
            <button
              type="button"
              onClick={() => go(item.to!)}
              className="transition-colors duration-150 ease-out hover:text-foreground"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function FormPageHeader({
  breadcrumb,
  title,
  subtitle,
  icon,
  backLabel,
  onBack,
  onNavigate,
  backPosition,
}: {
  breadcrumb: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  backLabel: string;
  onBack: () => void;
  onNavigate?: (to: string) => void;
  backPosition?: "top" | "right";
}) {
  return (
    <div className="space-y-3">
      {breadcrumb && breadcrumb.length > 0 && (
        <FormBreadcrumb items={breadcrumb} onNavigate={onNavigate} />
      )}
      {backPosition === "top" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className={cn("w-fit gap-1.5 px-0 text-xs text-muted-foreground hover:bg-transparent", BUTTON_PRESS)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {(!backPosition || backPosition === "right") && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onBack}
            className={cn("shrink-0", BUTTON_PRESS)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Outer card for a group of the form (e.g. "Brand Information"). Wraps one or more
 * FormSubsection blocks so each group can carry its own heading + helper copy, matching
 * the nested-card structure used across the module's create forms. */
export function FormSection({
  title,
  description,
  icon,
  index,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  index: number;
  children: ReactNode;
}) {
  const motion = sectionMotion(index);
  return (
    <Card
      className={cn("p-3", motion.className)}
      style={motion.style as CSSProperties}
    >
      <div className="mb-2 flex items-center gap-2">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

/** Inner bordered box nested inside a FormSection, holding one logical group of fields. */
export function FormSubsection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn("grid gap-2.5 sm:grid-cols-2", className)}>
        {children}
      </div>
    </div>
  );
}

/** Appended after a Label's text for required fields, e.g. `<Label>Brand name <RequiredMark /></Label>`. */
export function RequiredMark() {
  return (
    <span className="text-danger" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

/** Portals into the slot AppShell renders as its own shrink-0 row directly below <main>
 * (see providers/page-footer-slot.tsx) instead of rendering inline here. That slot sits
 * outside <main>'s scroll box entirely, so this can never end up stacked on top of this
 * page's own content no matter how that content's height changes — the previous
 * approaches here (sticky-in-scroll-flow with reserved padding, then a nested scroll
 * region) both still allowed real overlap or a mismatched scrollbar; this doesn't, because
 * the footer and the scrolling content are no longer in the same box at all. Renders
 * nothing on the very first render before AppShell's slot ref has mounted. */
export function FormFooter({ children }: { children: ReactNode }) {
  const slot = usePageFooterSlot();
  if (!slot) return null;
  return createPortal(
    <div className="shrink-0 border-t border-border bg-background">
      <div
        className={cn(
          "mx-auto flex min-h-7 items-center justify-end gap-1.5 pt-2",
          FORM_MAX_WIDTH,
        )}
      >
        {children}
      </div>
    </div>,
    slot,
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="animate-in fade-in duration-150 text-xs text-danger motion-reduce:animate-none">
      {message}
    </p>
  );
}

/** Inline banner for submit-level failures (e.g. a rejected mutation), shown at the top of
 * the form so a failed Create isn't only reported via a toast that can be missed/dismissed. */
export function FormErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="animate-in fade-in slide-in-from-top-1 duration-200 ease-out rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger motion-reduce:animate-none"
    >
      {message}
    </div>
  );
}

/** Footer action styled as its own bordered, neutral button — matching the header's
 * "Back to X" button — rather than a filled/colored one. */
export function FormCancelButton({
  onClick,
  disabled,
  size = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "xs";
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_PRESS}
    >
      Cancel
    </Button>
  );
}

export type SubmitStatus = "idle" | "submitting" | "success";

/** Primary footer action for a create or update form. Owns the submit -> loading -> success
 * sequence: disables on click, swaps the leading icon for a spinner then a checkmark, and
 * relabels itself at each stage so the button never sits disabled without explaining why.
 * `idleIcon` defaults to Plus (create forms) but takes any icon so an edit/update form can
 * pass something that actually matches its verb, e.g. Package for "Update Product". */
export function FormSubmitButton({
  formId,
  status,
  idleIcon,
  idleLabel,
  loadingLabel,
  successLabel,
  disabled,
  size = "default",
}: {
  formId: string;
  status: SubmitStatus;
  idleIcon?: ReactNode;
  idleLabel: string;
  loadingLabel: string;
  successLabel: string;
  disabled?: boolean;
  size?: "default" | "sm" | "xs";
}) {
  return (
    <Button
      type="submit"
      form={formId}
      variant="default"
      size={size}
      disabled={status !== "idle" || disabled}
      className={BUTTON_PRESS}
    >
      {status === "success" ? (
        <Check className="h-4 w-4" />
      ) : status === "submitting" ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      ) : (
        idleIcon ?? <Plus className="h-4 w-4" />
      )}
      {status === "success" ? successLabel : status === "submitting" ? loadingLabel : idleLabel}
    </Button>
  );
}

function DiscardChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          keepEditingRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Discard changes?</DialogTitle>
          <DialogDescription>
            You have unsaved changes that will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button ref={keepEditingRef} variant="outline" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Guards every way off a dirty create form — Cancel, the header's "Back to X" button,
 * breadcrumb links (all via `requestNavigate`/`goBack`), the browser Back/Forward button,
 * and tab close/refresh — behind a "Discard changes?" confirmation, then plays the form's
 * exit animation before actually navigating. Untouched forms navigate away immediately. */
export function useDiscardGuard(backTo: string, dirty: boolean) {
  const { leaving, goWithExit } = usePageTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const pendingRef = useRef(backTo);

  const requestNavigate = useCallback(
    (to: string) => {
      if (leaving) return;
      if (dirtyRef.current) {
        pendingRef.current = to;
        setConfirmOpen(true);
        return;
      }
      goWithExit(to);
    },
    [leaving, goWithExit],
  );

  const goBack = useCallback(() => requestNavigate(backTo), [requestNavigate, backTo]);

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false);
    goWithExit(pendingRef.current);
  }, [goWithExit]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    // The browser Back/Forward button only, via the Navigation API (Chromium): unlike
    // `popstate`, its `navigate` event fires *before* the traversal commits and is
    // synchronously cancelable, so we can block it outright instead of racing React Router's
    // own popstate listener to undo a navigation that already happened (which loses: RR can
    // unmount this component, and its confirm dialog with it, before a popstate-based guard
    // gets a turn). Falls back to no-op on browsers without `window.navigation` (Safari/Firefox
    // at time of writing) — Cancel, breadcrumb links, and beforeunload still guard those.
    const nav = (window as unknown as { navigation?: EventTarget }).navigation;
    if (!nav) return;
    function handleNavigate(e: Event) {
      const navigateEvent = e as Event & { navigationType?: string; preventDefault: () => void };
      if (navigateEvent.navigationType !== "traverse") return;
      if (!dirtyRef.current) return;
      navigateEvent.preventDefault();
      pendingRef.current = backTo;
      setConfirmOpen(true);
    }
    nav.addEventListener("navigate", handleNavigate);
    return () => nav.removeEventListener("navigate", handleNavigate);
  }, [backTo]);

  const discardDialog = (
    <DiscardChangesDialog open={confirmOpen} onOpenChange={setConfirmOpen} onDiscard={confirmDiscard} />
  );

  return { goBack, requestNavigate, leaving, exitTo: goWithExit, discardDialog };
}
