import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, Textarea, cn, toast } from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";
import { ImageDropzone } from "./image-dropzone";

export interface BrandFormValues {
  name: string;
  description: string;
  logoUrl: string;
  active: boolean;
}

export interface BrandFormBrand {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  active: boolean;
}

const EMPTY_FORM: BrandFormValues = { name: "", description: "", logoUrl: "", active: true };
const SUCCESS_DISPLAY_MS = 700;

interface BrandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandFormBrand | null;
  onSave: (values: BrandFormValues, id?: string) => Promise<void>;
}

export function BrandFormDialog({ open, onOpenChange, brand, onSave }: BrandFormDialogProps) {
  const [form, setForm] = useState<BrandFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const isEdit = !!brand;

  useEffect(() => {
    if (!open) return;
    setForm(
      brand
        ? { name: brand.name, description: brand.description ?? "", logoUrl: brand.logoUrl ?? "", active: brand.active }
        : EMPTY_FORM,
    );
    setSuccess(false);
  }, [open, brand]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(form, brand?.id);
      setSubmitting(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS));
      onOpenChange(false);
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to save brand");
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
          <DialogTitle>{isEdit ? "Edit brand" : "New brand"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Name</Label>
            <Input
              id="brand-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={FOCUS_GLOW}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-description">Description</Label>
            <Textarea
              id="brand-description"
              placeholder="Optional short description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={cn(FOCUS_GLOW, "min-h-[64px] resize-none")}
            />
          </div>
          <ImageDropzone
            label="Logo"
            value={form.logoUrl}
            onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
          />
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="brand-active">Status</Label>
              <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
            </div>
            <Switch id="brand-active" checked={form.active} onCheckedChange={(active) => setForm((f) => ({ ...f, active }))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.name.trim()} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create brand"}
            </Button>
          </DialogFooter>
        </form>

        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 animate-in fade-in duration-150 ease-out motion-reduce:animate-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success animate-in zoom-in-50 duration-300 ease-out motion-reduce:animate-none">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">{isEdit ? "Brand updated" : "Brand created"}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
