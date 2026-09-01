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
  Textarea,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";

const CURRENCIES = ["USD", "EUR", "GBP", "INR"];

export interface PriceListFormValues {
  name: string;
  code: string;
  description: string;
  currency: string;
  zone: string;
  priceSyncEnabled: boolean;
  productsAutoSyncEnabled: boolean;
  startDate: string;
  endDate: string;
  isDefault: boolean;
  active: boolean;
}

export interface PriceListFormRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  currency: string;
  zone: string | null;
  priceSyncEnabled: boolean;
  productsAutoSyncEnabled: boolean;
  startDate: string | null;
  endDate: string | null;
  isDefault: boolean;
  active: boolean;
}

const EMPTY_FORM: PriceListFormValues = {
  name: "",
  code: "",
  description: "",
  currency: "USD",
  zone: "",
  priceSyncEnabled: true,
  productsAutoSyncEnabled: true,
  startDate: "",
  endDate: "",
  isDefault: false,
  active: true,
};

const SUCCESS_DISPLAY_MS = 700;

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

interface PriceListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList: PriceListFormRow | null;
  onSave: (values: PriceListFormValues, id?: string) => Promise<void>;
}

export function PriceListFormDialog({ open, onOpenChange, priceList, onSave }: PriceListFormDialogProps) {
  const [form, setForm] = useState<PriceListFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const isEdit = !!priceList;

  useEffect(() => {
    if (!open) return;
    setForm(
      priceList
        ? {
            name: priceList.name,
            code: priceList.code ?? "",
            description: priceList.description ?? "",
            currency: priceList.currency,
            zone: priceList.zone ?? "",
            priceSyncEnabled: priceList.priceSyncEnabled,
            productsAutoSyncEnabled: priceList.productsAutoSyncEnabled,
            startDate: toDateInput(priceList.startDate),
            endDate: toDateInput(priceList.endDate),
            isDefault: priceList.isDefault,
            active: priceList.active,
          }
        : EMPTY_FORM,
    );
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
      <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit price list" : "New price list"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pl-name">Name</Label>
              <Input
                id="pl-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-code">Price list code</Label>
              <Input
                id="pl-code"
                placeholder="e.g. WHOLESALE-01"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-description">Description</Label>
            <Textarea
              id="pl-description"
              placeholder="Optional short description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue />
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
              <Label htmlFor="pl-zone">Zone</Label>
              <Input
                id="pl-zone"
                placeholder="e.g. North America"
                value={form.zone}
                onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pl-start">Start date</Label>
              <Input
                id="pl-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-end">End date</Label>
              <Input
                id="pl-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="pl-price-sync">Price sync enabled</Label>
              <p className="text-xs text-muted-foreground">Auto-update prices when linked source prices change.</p>
            </div>
            <Switch
              id="pl-price-sync"
              checked={form.priceSyncEnabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, priceSyncEnabled: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="pl-products-sync">Products auto sync enabled</Label>
              <p className="text-xs text-muted-foreground">Automatically include new products in this price list.</p>
            </div>
            <Switch
              id="pl-products-sync"
              checked={form.productsAutoSyncEnabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, productsAutoSyncEnabled: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="pl-default">Set as default</Label>
              <p className="text-xs text-muted-foreground">Used when no other price list applies.</p>
            </div>
            <Switch id="pl-default" checked={form.isDefault} onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="pl-active">Status</Label>
              <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
            </div>
            <Switch id="pl-active" checked={form.active} onCheckedChange={(active) => setForm((f) => ({ ...f, active }))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.name.trim()} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create price list"}
            </Button>
          </DialogFooter>
        </form>

        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 animate-in fade-in duration-150 ease-out motion-reduce:animate-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success animate-in zoom-in-50 duration-300 ease-out motion-reduce:animate-none">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">{isEdit ? "Price list updated" : "Price list created"}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
