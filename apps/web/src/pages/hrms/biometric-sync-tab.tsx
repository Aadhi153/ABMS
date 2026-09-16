import { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { Download, Monitor, RotateCcw } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, CARD_HOVER } from "../products/form-motion";
import type { Branch } from "./types";

const SYNC_BIOMETRIC_LOGS = gql`
  mutation SyncBiometricLogsTab($input: SyncBiometricLogsInput!) {
    syncBiometricLogs(input: $input) {
      success
      syncedCount
      message
    }
  }
`;

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const EMPTY_FORM = { branchId: "", from: toDateInputValue(firstOfMonth()), to: toDateInputValue(new Date()) };

export default function BiometricSyncTab({ branches }: { branches: Branch[] }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ syncedCount: number; message: string } | null>(null);
  const [rawLogsOpen, setRawLogsOpen] = useState(false);
  const [syncBiometricLogs] = useMutation(SYNC_BIOMETRIC_LOGS);

  async function handleFetchAndSync() {
    if (!form.branchId) {
      toast.error("Select a target branch");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await syncBiometricLogs({
        variables: { input: { branchId: form.branchId, from: form.from, to: form.to } },
      });
      const res = data?.syncBiometricLogs;
      setResult(res ? { syncedCount: res.syncedCount, message: res.message } : null);
      toast.success(res?.message ?? "Sync attempted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync biometric logs");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">eSSL Biometric Integration Settings</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Target Branch *</Label>
              <Select value={form.branchId} onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">From Date</Label>
              <Input type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">To Date</Label>
              <Input type="date" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Biometric Device</Label>
              <Select value="ALL" onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Registered Devices</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button disabled={submitting} onClick={handleFetchAndSync} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Download className="h-4 w-4" />
              {submitting ? "Syncing…" : "Fetch & Sync Logs"}
            </Button>
            <Button variant="outline" onClick={() => setRawLogsOpen(true)} className={cn("gap-1.5", BUTTON_PRESS)}>
              <Monitor className="h-4 w-4" />
              View Raw Logs
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset} className={BUTTON_PRESS} title="Reset">
              <RotateCcw className="h-4 w-4 text-danger" />
            </Button>
          </div>

          <div className={cn("rounded-lg border border-dashed border-border p-10 text-center", CARD_HOVER)}>
            <Monitor className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            {result ? (
              <>
                <p className="text-base font-semibold text-foreground">{result.syncedCount} log{result.syncedCount === 1 ? "" : "s"} synced</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{result.message}</p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-foreground">Biometric Connection Ready</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Establish a TCP/IP tunnel to the eSSL biometric machines to pull raw logs. Verify branch and date range, then fetch &amp; sync.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={rawLogsOpen} onOpenChange={setRawLogsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raw device logs</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Raw punch logs can only be viewed once a biometric device is connected to this organization. No device is configured in this environment yet.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
