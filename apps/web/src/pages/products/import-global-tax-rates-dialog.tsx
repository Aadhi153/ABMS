import { useState } from "react";
import { Globe } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, toast } from "@abms/ui";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";

interface GlobalTaxRate {
  name: string;
  code: string;
  rate: number;
  taxType: "GST" | "VAT" | "SALES_TAX" | "OTHER";
  country: string;
  state?: string;
}

const GLOBAL_TAX_RATES: GlobalTaxRate[] = [
  { name: "India GST 5%", code: "IN_GST_5", rate: 5, taxType: "GST", country: "India" },
  { name: "India GST 12%", code: "IN_GST_12", rate: 12, taxType: "GST", country: "India" },
  { name: "India GST 18%", code: "IN_GST_18", rate: 18, taxType: "GST", country: "India" },
  { name: "India GST 28%", code: "IN_GST_28", rate: 28, taxType: "GST", country: "India" },
  { name: "UK VAT Standard", code: "UK_VAT_STD", rate: 20, taxType: "VAT", country: "United Kingdom" },
  { name: "UK VAT Reduced", code: "UK_VAT_RED", rate: 5, taxType: "VAT", country: "United Kingdom" },
  { name: "France VAT Standard", code: "FR_VAT_STD", rate: 20, taxType: "VAT", country: "France" },
  { name: "Germany VAT Standard", code: "DE_VAT_STD", rate: 19, taxType: "VAT", country: "Germany" },
  { name: "US Sales Tax (avg)", code: "US_SALES_AVG", rate: 7.25, taxType: "SALES_TAX", country: "United States", state: "California" },
  { name: "UAE VAT Standard", code: "AE_VAT_STD", rate: 5, taxType: "VAT", country: "United Arab Emirates" },
  { name: "Singapore GST", code: "SG_GST", rate: 9, taxType: "GST", country: "Singapore" },
  { name: "Australia GST", code: "AU_GST", rate: 10, taxType: "GST", country: "Australia" },
];

interface ImportGlobalTaxRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCodes: Set<string>;
  onImport: (rates: GlobalTaxRate[]) => Promise<void>;
}

export function ImportGlobalTaxRatesDialog({ open, onOpenChange, existingCodes, onImport }: ImportGlobalTaxRatesDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  function toggle(code: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next && importing) return;
    if (!next) setSelected(new Set());
    onOpenChange(next);
  }

  async function handleImport() {
    const rates = GLOBAL_TAX_RATES.filter((r) => selected.has(r.code));
    if (rates.length === 0) return;
    setImporting(true);
    try {
      await onImport(rates);
      toast.success(`Imported ${rates.length} tax rate${rates.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import tax rates");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
        <DialogHeader>
          <DialogTitle>Import global tax rates</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Select common tax rates to add to your organization.</p>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {GLOBAL_TAX_RATES.map((r) => {
            const already = existingCodes.has(r.code);
            return (
              <label
                key={r.code}
                className={`flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm ${already ? "opacity-50" : "cursor-pointer hover:bg-muted/40"}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  disabled={already}
                  checked={selected.has(r.code)}
                  onChange={() => toggle(r.code)}
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.country}
                    {r.state ? ` · ${r.state}` : ""} · {r.rate}%{already ? " · Already added" : ""}
                  </p>
                </div>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={importing || selected.size === 0}
            onClick={handleImport}
            className={BUTTON_PRESS}
          >
            {importing ? "Importing…" : `Import selected${selected.size ? ` (${selected.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
