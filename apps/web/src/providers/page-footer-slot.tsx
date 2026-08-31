import { createContext, useContext } from "react";

/** DOM node AppShell renders as a shrink-0 row directly below <main>, outside its
 * scrolling box. FormFooter (products/form-page.tsx) portals into it instead of
 * rendering inline, so a page's persistent action bar can never end up stacked on top of
 * that page's own scrolling content — there's no shared scroll flow for it to overlap. */
export const PageFooterSlotContext = createContext<HTMLDivElement | null>(null);

export function usePageFooterSlot() {
  return useContext(PageFooterSlotContext);
}
