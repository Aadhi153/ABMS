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
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";

export interface CategoryFormValues {
  name: string;
  code: string;
  description: string;
  color: string;
  parentId: string;
  active: boolean;
  sortOrder: string;
}

export interface CategoryFormRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: string | null;
  parentId: string | null;
  active: boolean;
  sortOrder: number;
}

export interface CategoryParentOption {
  id: string;
  name: string;
}

const EMPTY_FORM: CategoryFormValues = {
  name: "",
  code: "",
  description: "",
  color: "",
  parentId: "",
  active: true,
  sortOrder: "0",
};

const SUCCESS_DISPLAY_MS = 700;
const NONE_PARENT = "__none__";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryFormRow | null;
  parentOptions: CategoryParentOption[];
  onSave: (values: CategoryFormValues, id?: string) => Promise<void>;
}

export function CategoryFormDialog({ open, onOpenChange, category, parentOptions, onSave }: CategoryFormDialogProps) {
  const [form, setForm] = useState<CategoryFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const isEdit = !!category;

  useEffect(() => {
    if (!open) return;
    setForm(
      category
        ? {
            name: category.name,
            code: category.code ?? "",
            description: category.description ?? "",
            color: category.color ?? "",
            parentId: category.parentId ?? "",
            active: category.active,
            sortOrder: String(category.sortOrder),
          }
        : EMPTY_FORM,
    );
    setSuccess(false);
  }, [open, category]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(form, category?.id);
      setSubmitting(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS));
      onOpenChange(false);
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && (submitting || success)) return;
    onOpenChange(next);
  }

  // Exclude the category itself from its own parent options (avoid self-parenting).
  const availableParents = parentOptions.filter((p) => p.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-code">Code</Label>
              <Input
                id="cat-code"
                placeholder="e.g. CAT12"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              placeholder="Optional short description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={cn(FOCUS_GLOW, "min-h-[64px] resize-none")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cat-color"
                  type="color"
                  value={form.color || "#64748b"}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className={cn(FOCUS_GLOW, "h-9 w-12 p-1")}
                />
                <Input
                  aria-label="Color hex value"
                  placeholder="#64748b"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className={FOCUS_GLOW}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-sort">Sort order</Label>
              <Input
                id="cat-sort"
                type="number"
                step="1"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Parent category</Label>
            <Select
              value={form.parentId || NONE_PARENT}
              onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === NONE_PARENT ? "" : v }))}
            >
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_PARENT}>None (top-level)</SelectItem>
                {availableParents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="cat-active">Status</Label>
              <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
            </div>
            <Switch id="cat-active" checked={form.active} onCheckedChange={(active) => setForm((f) => ({ ...f, active }))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.name.trim()} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>

        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 animate-in fade-in duration-150 ease-out motion-reduce:animate-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success animate-in zoom-in-50 duration-300 ease-out motion-reduce:animate-none">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">{isEdit ? "Category updated" : "Category created"}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
