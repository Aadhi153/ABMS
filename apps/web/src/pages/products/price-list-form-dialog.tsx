import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea, cn, toast } from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";

export interface PriceListFormValues {
  name: string;
  code: string;
  currency: string;
  description: string;
  active: boolean;
}

const EMPTY_FORM: PriceListFormValues = { name: "", code: "", currency: "USD", description: "", active: true };
const SUCCESS_DISPLAY_MS = 700;
const CURRENCIES = ["USD", "EUR", "GBP", "INR"];

interface PriceListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList: (PriceListFormValues & { id: string }) | null;
  onSave: (values: PriceListFormValues, id?: string) => Promise<void>;
}

export function PriceListFormDialog({ open, onOpenChange, priceList, onSave }: PriceListFormDialogProps) {
  const [form, setForm] = useState<PriceListFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const isEdit = !!priceList;

  useEffect(() => {
    if (!open) return;
    setForm(priceList ? { ...priceList } : EMPTY_FORM);
    setSuccess(false);
  }, [open, priceList]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(form, priceList?.id);
      setSubmitting(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS));
      onOpenChange(false);
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to save price list");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && (submitting || success)) return;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(DIALOG_CONTENT_MOTION, "sm:max-w-[500px]")} overlayClassName={DIALOG_OVERLAY_MOTION}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Price List" : "Create Price List"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="pl-name">Price List Name <span className="text-danger">*</span></Label>
            <Input
              id="pl-name"
              required
              placeholder="e.g., Summer Sale 2024"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-code">Price List Code <span className="text-danger">*</span></Label>
            <div className="flex gap-2">
              <Input
                id="pl-code"
                required
                placeholder="SUMMER-2024"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className={cn(FOCUS_GLOW, "uppercase")}
              />
              <Button type="button" variant="outline" className={BUTTON_PRESS}>Auto</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-desc">Description</Label>
            <Textarea
              id="pl-desc"
              placeholder="Enter description..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={cn(FOCUS_GLOW, "resize-none")}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="pl-active">Active Status</Label>
              <p className="text-xs text-muted-foreground">Make this price list available for use</p>
            </div>
            <Switch
              id="pl-active"
              checked={form.active}
              onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
            />
          </div>
          <DialogFooter className="mt-4 pt-2">
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
                "Create Price List"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
