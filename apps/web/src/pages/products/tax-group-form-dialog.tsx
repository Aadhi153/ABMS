import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, toast } from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";

export interface TaxGroupFormValues {
  name: string;
  code: string;
  active: boolean;
  taxRateIds: string[];
}

export interface TaxGroupFormRateOption {
  id: string;
  name: string;
  rate: number;
}

export interface TaxGroupFormRow {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  taxRates: TaxGroupFormRateOption[];
}

const EMPTY_FORM: TaxGroupFormValues = { name: "", code: "", active: true, taxRateIds: [] };
const SUCCESS_DISPLAY_MS = 700;

interface TaxGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxGroup: TaxGroupFormRow | null;
  taxRateOptions: TaxGroupFormRateOption[];
  onSave: (values: TaxGroupFormValues, id: string) => Promise<void>;
}

export function TaxGroupFormDialog({ open, onOpenChange, taxGroup, taxRateOptions, onSave }: TaxGroupFormDialogProps) {
  const [form, setForm] = useState<TaxGroupFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      taxGroup
        ? {
            name: taxGroup.name,
            code: taxGroup.code ?? "",
            active: taxGroup.active,
            taxRateIds: taxGroup.taxRates.map((r) => r.id),
          }
        : EMPTY_FORM,
    );
    setSuccess(false);
  }, [open, taxGroup]);

  function toggleRate(id: string) {
    setForm((f) => ({
      ...f,
      taxRateIds: f.taxRateIds.includes(id) ? f.taxRateIds.filter((r) => r !== id) : [...f.taxRateIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !taxGroup) return;
    setSubmitting(true);
    try {
      await onSave(form, taxGroup.id);
      setSubmitting(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS));
      onOpenChange(false);
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to save tax group");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && (submitting || success)) return;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
        <DialogHeader>
          <DialogTitle>Edit tax group</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tg-name">Name</Label>
              <Input
                id="tg-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tg-code">Code</Label>
              <Input
                id="tg-code"
                placeholder="e.g. GST-COMBO"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tax rates</Label>
            {taxRateOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tax rates available — create one first.</p>
            ) : (
              <div className="space-y-1.5 rounded-md border border-border p-3 max-h-60 overflow-y-auto">
                {taxRateOptions.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={form.taxRateIds.includes(r.id)}
                      onChange={() => toggleRate(r.id)}
                    />
                    {r.name} ({r.rate}%)
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="tg-active">Status</Label>
              <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
            </div>
            <Switch id="tg-active" checked={form.active} onCheckedChange={(active) => setForm((f) => ({ ...f, active }))} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.name.trim()} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>

        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 animate-in fade-in duration-150 ease-out motion-reduce:animate-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success animate-in zoom-in-50 duration-300 ease-out motion-reduce:animate-none">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">Tax group updated</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
