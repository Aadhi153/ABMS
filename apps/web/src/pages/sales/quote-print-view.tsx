import { createPortal } from "react-dom";

interface PrintQuoteItem {
  productName: string;
  sku: string;
  hsnSac: string | null;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  lineTotal: number;
}

export interface PrintQuoteData {
  quoteNumber: string;
  status: string;
  validUntil: string | null;
  reference: string | null;
  paymentTerms: string | null;
  taxMethod: string;
  customerNotes: string | null;
  termsConditions: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: PrintQuoteItem[];
  subtotal: number;
  discountAmount: number;
  tax: number;
  shippingAmount: number;
  total: number;
}

function inr(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** The quote's formatted document layout — shared by the on-screen Preview dialog
 * and the print/PDF output, so what you preview is exactly what prints. */
export function QuotePrintDocument({ quote }: { quote: PrintQuoteData }) {
  return (
    <div className="bg-white p-8 text-neutral-900">
      <div className="flex items-start justify-between border-b border-neutral-300 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quote</h1>
          <p className="mt-1 text-sm text-neutral-500">{quote.quoteNumber}</p>
        </div>
        <div className="text-right text-sm text-neutral-500">
          <p className="font-medium text-neutral-900">{quote.status}</p>
          <p className="mt-1">Valid until {formatDate(quote.validUntil)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Billed To</p>
          <p className="mt-1 font-medium text-neutral-900">{quote.customerName}</p>
          {quote.customerEmail && <p className="text-neutral-500">{quote.customerEmail}</p>}
          {quote.customerPhone && <p className="text-neutral-500">{quote.customerPhone}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Details</p>
          <p className="mt-1 text-neutral-700">Reference: {quote.reference || "—"}</p>
          <p className="text-neutral-700">Payment Terms: {quote.paymentTerms || "—"}</p>
          <p className="text-neutral-700">Tax Method: {quote.taxMethod === "INCLUSIVE" ? "Inclusive" : "Exclusive"}</p>
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wide text-neutral-400">
            <th className="py-2 font-semibold">Product</th>
            <th className="py-2 font-semibold">HSN/SAC</th>
            <th className="py-2 text-right font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Unit Price</th>
            <th className="py-2 text-right font-semibold">Discount</th>
            <th className="py-2 text-right font-semibold">Tax</th>
            <th className="py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((it, idx) => (
            <tr key={idx} className="border-b border-neutral-200">
              <td className="py-2">
                <p className="font-medium text-neutral-900">{it.productName}</p>
                <p className="text-xs text-neutral-400">{it.sku}</p>
              </td>
              <td className="py-2 text-neutral-500">{it.hsnSac || "—"}</td>
              <td className="py-2 text-right text-neutral-700">
                {it.quantity} {it.uom}
              </td>
              <td className="py-2 text-right text-neutral-700">{inr(it.unitPrice)}</td>
              <td className="py-2 text-right text-neutral-700">{it.discountPct}%</td>
              <td className="py-2 text-right text-neutral-700">{it.taxPct}%</td>
              <td className="py-2 text-right font-medium text-neutral-900">{inr(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>{inr(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Discount</span>
            <span>-{inr(quote.discountAmount)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Tax</span>
            <span>{inr(quote.tax)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Shipping</span>
            <span>{inr(quote.shippingAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-300 pt-1.5 text-base font-bold text-neutral-900">
            <span>Total</span>
            <span>{inr(quote.total)}</span>
          </div>
        </div>
      </div>

      {(quote.customerNotes || quote.termsConditions) && (
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-neutral-300 pt-4 text-xs text-neutral-600">
          {quote.customerNotes && (
            <div>
              <p className="font-semibold uppercase tracking-wide text-neutral-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap">{quote.customerNotes}</p>
            </div>
          )}
          {quote.termsConditions && (
            <div>
              <p className="font-semibold uppercase tracking-wide text-neutral-400">Terms &amp; Conditions</p>
              <p className="mt-1 whitespace-pre-wrap">{quote.termsConditions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Portals a print-only copy of the quote document to document.body, hidden on
 * screen (`hidden print:block`). A scoped print stylesheet hides everything else
 * on the page so `window.print()` (used for both "Print" and "Download PDF" —
 * the browser's print dialog lets the user pick a PDF destination) outputs only
 * this document instead of the whole app shell. */
export function QuotePrintPortal({ quote }: { quote: PrintQuoteData }) {
  return createPortal(
    <div id="quote-print-root" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quote-print-root, #quote-print-root * { visibility: visible; }
          #quote-print-root { position: absolute; inset: 0; width: 100%; }
        }
      `}</style>
      <QuotePrintDocument quote={quote} />
    </div>,
    document.body,
  );
}
