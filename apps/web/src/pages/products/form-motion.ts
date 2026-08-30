import { useCallback, useState } from "react";
import { useNavigate, type NavigateOptions } from "react-router-dom";

/**
 * Shared animation classes for the products module's list <-> create-form navigation.
 * Two layers, one consistent push/pop feel:
 *  - "list" (a *-tab.tsx) is the parent layer: it recedes left when a create form opens,
 *    and re-enters from the left when you come back.
 *  - "form" (a new-*-page.tsx) is the child layer: it enters from the right when opened,
 *    and exits back to the right when cancelled/saved/backed out of.
 * Both use the same duration/easing so entrance and exit read as one continuous motion
 * instead of an abrupt route swap.
 */
const TRANSITION_MS = 200;

export const FORM_ENTER = "animate-in fade-in slide-in-from-right-4 duration-200 ease-out motion-reduce:animate-none";
export const FORM_EXIT = "animate-out fade-out slide-out-to-right-4 duration-200 ease-out motion-reduce:animate-none";
export const LIST_ENTER = "animate-in fade-in slide-in-from-left-4 duration-200 ease-out motion-reduce:animate-none";
export const LIST_EXIT = "animate-out fade-out slide-out-to-left-4 duration-200 ease-out motion-reduce:animate-none";

export const FOCUS_GLOW =
  "transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary";

export const BUTTON_PRESS = "transition-transform duration-150 ease-out active:scale-[0.97]";

const SECTION_STAGGER_MS = 40;

/** Entrance stagger for a form section — each one fades/slides in ~40ms after the previous. */
export function sectionMotion(index: number) {
  return {
    className: "animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out motion-reduce:animate-none",
    style: { animationDelay: `${index * SECTION_STAGGER_MS}ms`, animationFillMode: "backwards" as const },
  };
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** How long a submit button holds its success checkmark before the page navigates away. */
export const SUCCESS_HOLD_MS = 500;

/** Runs `after` once the success checkmark has had a moment to register with the user,
 * collapsing to an instant transition under reduced motion (same convention as usePageTransition). */
export function holdSuccessThen(after: () => void) {
  window.setTimeout(after, prefersReducedMotion() ? 0 : SUCCESS_HOLD_MS);
}

/** Plays the page's exit animation before navigating away, so leaving a list or a create form
 * reads as one continuous motion instead of the route swapping out from under the user mid-frame. */
export function usePageTransition() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const goWithExit = useCallback(
    (to: string, options?: NavigateOptions) => {
      setLeaving(true);
      window.setTimeout(() => navigate(to, options), prefersReducedMotion() ? 0 : TRANSITION_MS);
    },
    [navigate],
  );

  return { leaving, goWithExit };
}
