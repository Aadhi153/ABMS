/**
 * Shared animation classes for dialogs across the Products module — fade +
 * scale entrance/exit (~200ms, ease-out) with a blurred backdrop. Radix defers
 * unmount until the `data-[state=closed]` animation finishes, so this drives
 * both the open and close transitions with no extra JS.
 */
export const DIALOG_CONTENT_MOTION =
  "duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 motion-reduce:animate-none";

export const DIALOG_OVERLAY_MOTION =
  "bg-black/50 backdrop-blur-sm duration-200 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none";

/** ~150ms border-color + ring glow on focus, used on the brand form's inputs. */
export const FOCUS_GLOW =
  "transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary";

/** Tactile press feedback + hover color transition, used on this page's buttons. */
export const BUTTON_PRESS = "transition-transform duration-150 ease-out active:scale-[0.97]";
