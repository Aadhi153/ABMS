import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, Textarea, cn, toast } from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";

export interface PricingTierFormValues {
  name: string;
  description: string;
  priorityLevel: number;
  active: boolean;
  discountPercent: string;
  minOrderValue: string;
  customerTag: string;
}

const EMPTY_FORM: PricingTierFormValues = {
  name: "",
  description: "",
  priorityLevel: 1,
  active: true,
  discountPercent: "",
  minOrderValue: "",
  customerTag: "",
};
const SUCCESS_DISPLAY_MS = 700;

interface PricingTierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: (PricingTierFormValues & { id: string }) | null;
  onSave: (values: PricingTierFormValues, id?: string) => Promise<void>;
}

export function PricingTierFormDialog({ open, onOpenChange, tier, onSave }: PricingTierFormDialogProps) {
  const [form, setForm] = useState<PricingTierFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const isEdit = !!tier;

  useEffect(() => {
    if (!open) return;
    setForm(tier ? { ...tier } : EMPTY_FORM);
    setSuccess(false);
    setActiveTab("basic");
  }, [open, tier]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(form, tier?.id);
      setSubmitting(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS));
      onOpenChange(false);
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to save pricing tier");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && (submitting || success)) return;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(DIALOG_CONTENT_MOTION, "sm:max-w-[550px]")} overlayClassName={DIALOG_OVERLAY_MOTION}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Pricing Tier" : "Create New Pricing Tier"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center gap-2 border-b border-border pb-2">
          {[
            { id: "basic", label: "Basic Info" },
            { id: "rules", label: "Rules" },
            { id: "validity", label: "Validity" },
            { id: "conditions", label: "Conditions" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {activeTab === "basic" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-1.5">
                <Label htmlFor="pt-name">Tier Name <span className="text-danger">*</span></Label>
                <Input
                  id="pt-name"
                  required
                  placeholder="e.g., Wholesale VIP"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt-desc">Description</Label>
                <Textarea
                  id="pt-desc"
                  placeholder="Enter description..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={cn(FOCUS_GLOW, "resize-none")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pt-priority">Priority Level</Label>
                  <Input
                    id="pt-priority"
                    type="number"
                    min="1"
                    value={form.priorityLevel}
                    onChange={(e) => setForm((f) => ({ ...f, priorityLevel: parseInt(e.target.value) || 1 }))}
                    className={FOCUS_GLOW}
                  />
                  <p className="text-[11px] text-muted-foreground">Lower numbers take precedence</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <div className="flex h-9 items-center justify-between rounded-md border border-border px-3">
                    <span className="text-sm">Active</span>
                    <Switch
                      checked={form.active}
                      onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== "basic" && (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground animate-in fade-in zoom-in-95 duration-200">
              Settings for {activeTab} will go here.
            </div>
          )}

          <DialogFooter className="mt-4 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting || success}
              className={BUTTON_PRESS}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || success} className={BUTTON_PRESS}>
              {success ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Saved
                </>
              ) : submitting ? (
                "Saving…"
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Tier"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
