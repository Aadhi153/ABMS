import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
import { BUTTON_PRESS, FORM_ENTER, FORM_EXIT, sectionMotion, usePageTransition } from "./form-motion";

/** Content column width shared by the scroll area and the footer's button row, so the
 * footer's buttons stay aligned under the form cards above them. */
const FORM_MAX_WIDTH = "max-w-5xl";

/** Outer flex column that always fills the routed page's available height, so FormFooter
 * (a non-scrolling flex sibling kept structurally outside the scrolling region — see
 * FormFooter for why that matters) stays pinned to the bottom of the viewport instead of
 * floating right under a short step's content and exposing blank page background below it.
 * Content taller than the available height still scrolls internally via FormScrollArea;
 * short content just leaves its slack space above the footer instead of below it.
 * `leaving` (from useDiscardGuard) swaps the entrance animation for its mirrored exit so the
 * page slides back out the way it came in before the route actually changes. */
export function FormPage({ children, leaving }: { children: ReactNode; leaving?: boolean }) {
  return <div className={cn("flex h-full min-h-0 flex-col", leaving ? FORM_EXIT : FORM_ENTER)}>{children}</div>;
}

/** The form page's actual scrolling region. Only this area scrolls — FormFooter lives outside
 * it as a flex sibling, so it never has to fight scroll position to avoid covering content. */
export function FormScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("mx-auto space-y-6 pb-6", FORM_MAX_WIDTH)}>
        {children}
      </div>
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
  backLabel,
  onBack,
  onNavigate,
}: {
  breadcrumb: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  backLabel: string;
  onBack: () => void;
  onNavigate?: (to: string) => void;
}) {
  return (
    <div className="space-y-3">
      <FormBreadcrumb items={breadcrumb} onNavigate={onNavigate} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className={cn("shrink-0", BUTTON_PRESS)}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
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
  index,
  children,
}: {
  title: string;
  description?: string;
  index: number;
  children: ReactNode;
}) {
  const motion = sectionMotion(index);
  return (
    <Card
      className={cn("p-6", motion.className)}
      style={motion.style as CSSProperties}
    >
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
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
    <div className="rounded-lg border border-border p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
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

/** Lives outside FormScrollArea as a plain flex sibling (not position: sticky). A sticky
 * footer nested inside the scrolling content pins to the viewport bottom for the whole scroll
 * journey on any form taller than one screen, painting over whatever section is still passing
 * underneath — it only clears at the very end of the scroll. Keeping it structurally outside
 * the scroll region avoids that class of bug entirely instead of padding around it. */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="z-10 shrink-0 border-t border-border bg-muted/40 px-6 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <div
        className={cn(
          "mx-auto flex min-h-[72px] items-center justify-end gap-2 py-4",
          FORM_MAX_WIDTH,
        )}
      >
        {children}
      </div>
    </div>
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
  size?: "default" | "sm";
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

/** Primary footer action for a create form. Owns the submit -> loading -> success sequence:
 * disables on click, swaps the leading icon for a spinner then a checkmark, and relabels
 * itself at each stage so the button never sits disabled without explaining why. */
export function FormSubmitButton({
  formId,
  status,
  idleLabel,
  loadingLabel,
  successLabel,
  disabled,
  size = "default",
}: {
  formId: string;
  status: SubmitStatus;
  idleLabel: string;
  loadingLabel: string;
  successLabel: string;
  disabled?: boolean;
  size?: "default" | "sm";
}) {
  return (
    <Button
      type="submit"
      form={formId}
      variant="outline"
      size={size}
      disabled={status !== "idle" || disabled}
      className={BUTTON_PRESS}
    >
      {status === "success" ? (
        <Check className="h-4 w-4" />
      ) : status === "submitting" ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      ) : (
        <Plus className="h-4 w-4" />
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
