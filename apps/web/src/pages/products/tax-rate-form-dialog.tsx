import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";

const TAX_TYPES = [
  { value: "GST", label: "GST" },
  { value: "VAT", label: "VAT" },
  { value: "SALES_TAX", label: "Sales tax" },
  { value: "OTHER", label: "Other" },
] as const;

export interface TaxRateFormValues {
  name: string;
  code: string;
  rate: string;
  taxType: (typeof TAX_TYPES)[number]["value"];
  country: string;
  state: string;
  isDefault: boolean;
  active: boolean;
}

export interface TaxRateFormRow {
  id: string;
  name: string;
  code: string | null;
  rate: number;
  taxType: (typeof TAX_TYPES)[number]["value"];
  country: string | null;
  state: string | null;
  isDefault: boolean;
  active: boolean;
}

const EMPTY_FORM: TaxRateFormValues = {
  name: "",
  code: "",
  rate: "",
  taxType: "OTHER",
  country: "",
  state: "",
  isDefault: false,
  active: true,
};

const SUCCESS_DISPLAY_MS = 700;

interface TaxRateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxRate: TaxRateFormRow | null;
  onSave: (values: TaxRateFormValues, id?: string) => Promise<void>;
}

export function TaxRateFormDialog({ open, onOpenChange, taxRate, onSave }: TaxRateFormDialogProps) {
  const [form, setForm] = useState<TaxRateFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const isEdit = !!taxRate;

  useEffect(() => {
    if (!open) return;
    setForm(
      taxRate
        ? {
            name: taxRate.name,
            code: taxRate.code ?? "",
            rate: String(taxRate.rate),
            taxType: taxRate.taxType,
            country: taxRate.country ?? "",
            state: taxRate.state ?? "",
            isDefault: taxRate.isDefault,
            active: taxRate.active,
          }
        : EMPTY_FORM,
    );
    setSuccess(false);
  }, [open, taxRate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.rate === "") return;
    setSubmitting(true);
    try {
      await onSave(form, taxRate?.id);
      setSubmitting(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS));
      onOpenChange(false);
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to save tax rate");
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
          <DialogTitle>{isEdit ? "Edit tax rate" : "New tax rate"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tr-name">Name</Label>
              <Input
                id="tr-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-code">Tax code</Label>
              <Input
                id="tr-code"
                placeholder="e.g. GST12"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tr-rate">Rate (%)</Label>
              <Input
                id="tr-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={form.rate}
                onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tax type</Label>
              <Select value={form.taxType} onValueChange={(v) => setForm((f) => ({ ...f, taxType: v as typeof form.taxType }))}>
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tr-country">Country</Label>
              <Input
                id="tr-country"
                placeholder="e.g. India"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-state">State</Label>
              <Input
                id="tr-state"
                placeholder="e.g. Tamil Nadu"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="tr-default">Set as default</Label>
              <p className="text-xs text-muted-foreground">Used when a product doesn&apos;t specify a tax rate.</p>
            </div>
            <Switch id="tr-default" checked={form.isDefault} onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="tr-active">Status</Label>
              <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
            </div>
            <Switch id="tr-active" checked={form.active} onCheckedChange={(active) => setForm((f) => ({ ...f, active }))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.name.trim() || form.rate === ""} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create tax rate"}
            </Button>
          </DialogFooter>
        </form>

        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 animate-in fade-in duration-150 ease-out motion-reduce:animate-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success animate-in zoom-in-50 duration-300 ease-out motion-reduce:animate-none">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">{isEdit ? "Tax rate updated" : "Tax rate created"}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
