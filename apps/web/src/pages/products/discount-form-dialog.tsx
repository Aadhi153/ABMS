import { useEffect, useState, type FormEvent } from "react";
import { gql, useQuery } from "@apollo/client";
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
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION, FOCUS_GLOW } from "./dialog-motion";

const DISCOUNT_SCOPE_OPTIONS_QUERY = gql`
  query DiscountFormScopeOptions {
    categories {
      id
      name
    }
    brands {
      id
      name
    }
  }
`;

type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
type AppliesTo = "ALL" | "CATEGORY" | "BRAND";

export interface DiscountFormValues {
  name: string;
  type: DiscountType;
  value: string;
  appliesTo: AppliesTo;
  categoryId: string;
  brandId: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  minPurchaseAmount: string;
  minQuantity: string;
  couponCode: string;
  active: boolean;
}

export interface DiscountFormRow {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  appliesTo: AppliesTo;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  minPurchaseAmount: number | null;
  minQuantity: number | null;
  couponCode: string | null;
  active: boolean;
}

const EMPTY_FORM: DiscountFormValues = {
  name: "",
  type: "PERCENTAGE",
  value: "",
  appliesTo: "ALL",
  categoryId: "",
  brandId: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  minPurchaseAmount: "",
  minQuantity: "",
  couponCode: "",
  active: true,
};

const SUCCESS_DISPLAY_MS = 700;

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

interface DiscountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: DiscountFormRow | null;
  onSave: (values: DiscountFormValues, id?: string) => Promise<void>;
}

export function DiscountFormDialog({ open, onOpenChange, discount, onSave }: DiscountFormDialogProps) {
  const { data } = useQuery<{
    categories: Array<{ id: string; name: string }>;
    brands: Array<{ id: string; name: string }>;
  }>(DISCOUNT_SCOPE_OPTIONS_QUERY, { skip: !open });
  const [form, setForm] = useState<DiscountFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const isEdit = !!discount;

  useEffect(() => {
    if (!open) return;
    setForm(
      discount
        ? {
            name: discount.name,
            type: discount.type,
            value: String(discount.value),
            appliesTo: discount.appliesTo,
            categoryId: discount.category?.id ?? "",
            brandId: discount.brand?.id ?? "",
            startDate: toDateInputValue(discount.startDate),
            endDate: toDateInputValue(discount.endDate),
            usageLimit: discount.usageLimit != null ? String(discount.usageLimit) : "",
            minPurchaseAmount: discount.minPurchaseAmount != null ? String(discount.minPurchaseAmount) : "",
            minQuantity: discount.minQuantity != null ? String(discount.minQuantity) : "",
            couponCode: discount.couponCode ?? "",
            active: discount.active,
          }
        : EMPTY_FORM,
    );
    setSuccess(false);
  }, [open, discount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.value === "") return;
    setSubmitting(true);
    try {
      await onSave(form, discount?.id);
      setSubmitting(false);
      setSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS));
      onOpenChange(false);
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Failed to save discount");
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
          <DialogTitle>{isEdit ? "Edit discount scheme" : "New discount scheme"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 max-h-[70vh] overflow-y-auto pr-1" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="disc-name">Name</Label>
              <Input
                id="disc-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as DiscountType }))}>
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disc-value">{form.type === "PERCENTAGE" ? "Value (%)" : "Value ($)"}</Label>
              <Input
                id="disc-value"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Applies to</Label>
            <Select value={form.appliesTo} onValueChange={(v) => setForm((f) => ({ ...f, appliesTo: v as AppliesTo }))}>
              <SelectTrigger className={FOCUS_GLOW}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All products</SelectItem>
                <SelectItem value="CATEGORY">A category</SelectItem>
                <SelectItem value="BRAND">A brand</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.appliesTo === "CATEGORY" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {form.appliesTo === "BRAND" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none">
              <Label>Brand</Label>
              <Select value={form.brandId} onValueChange={(v) => setForm((f) => ({ ...f, brandId: v }))}>
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.brands ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disc-start">Start date</Label>
              <Input
                id="disc-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disc-end">End date</Label>
              <Input
                id="disc-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disc-usage-limit">Usage limit</Label>
              <Input
                id="disc-usage-limit"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={form.usageLimit}
                onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disc-coupon">Coupon code</Label>
              <Input
                id="disc-coupon"
                placeholder="Optional"
                value={form.couponCode}
                onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disc-min-purchase">Min purchase amount</Label>
              <Input
                id="disc-min-purchase"
                type="number"
                step="0.01"
                min="0"
                placeholder="No minimum"
                value={form.minPurchaseAmount}
                onChange={(e) => setForm((f) => ({ ...f, minPurchaseAmount: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disc-min-qty">Min quantity</Label>
              <Input
                id="disc-min-qty"
                type="number"
                min="1"
                placeholder="No minimum"
                value={form.minQuantity}
                onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value }))}
                className={FOCUS_GLOW}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="disc-active">Status</Label>
              <p className="text-xs text-muted-foreground">{form.active ? "Active" : "Inactive"}</p>
            </div>
            <Switch id="disc-active" checked={form.active} onCheckedChange={(active) => setForm((f) => ({ ...f, active }))} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !form.name.trim() || form.value === ""} className={cn(BUTTON_PRESS)}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create discount scheme"}
            </Button>
          </DialogFooter>
        </form>

        {success && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/95 animate-in fade-in duration-150 ease-out motion-reduce:animate-none">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success animate-in zoom-in-50 duration-300 ease-out motion-reduce:animate-none">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">{isEdit ? "Discount scheme updated" : "Discount scheme created"}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
