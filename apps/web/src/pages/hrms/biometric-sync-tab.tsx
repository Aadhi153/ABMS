import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Download, Monitor, Pencil, Plus, Radio, RotateCcw, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  cn,
  toast,
} from "@abms/ui";
import { BUTTON_PRESS, CARD_HOVER } from "../products/form-motion";
import type { Branch, BiometricTerminal } from "./types";

const SYNC_BIOMETRIC_LOGS = gql`
  mutation SyncBiometricLogsTab($input: SyncBiometricLogsInput!) {
    syncBiometricLogs(input: $input) {
      success
      syncedCount
      message
    }
  }
`;
const TERMINALS_QUERY = gql`
  query BiometricTerminalsTab {
    biometricTerminals {
      id
      name
      code
      branchId
      branchName
      capabilities
      status
      lastSeenAt
      active
    }
  }
`;
const CREATE_TERMINAL = gql`
  mutation CreateBiometricTerminalTab($input: CreateBiometricTerminalInput!) {
    createBiometricTerminal(input: $input) {
      id
    }
  }
`;
const UPDATE_TERMINAL = gql`
  mutation UpdateBiometricTerminalTab($id: String!, $input: UpdateBiometricTerminalInput!) {
    updateBiometricTerminal(id: $id, input: $input) {
      id
    }
  }
`;
const DELETE_TERMINAL = gql`
  mutation DeleteBiometricTerminalTab($id: String!) {
    deleteBiometricTerminal(id: $id)
  }
`;

const VERIFY_METHODS = ["FACE_ID", "FINGERPRINT", "MANUAL"] as const;
const VERIFY_METHOD_LABEL: Record<string, string> = { FACE_ID: "FaceID", FINGERPRINT: "Fingerprint", MANUAL: "Manual" };
const EMPTY_TERMINAL_FORM = { name: "", code: "", branchId: "", capabilities: [] as string[], status: "ONLINE" };

function TerminalsCard({ branches }: { branches: Branch[] }) {
  const { data, loading, refetch } = useQuery<{ biometricTerminals: BiometricTerminal[] }>(TERMINALS_QUERY);
  const [createTerminal] = useMutation(CREATE_TERMINAL);
  const [updateTerminal] = useMutation(UPDATE_TERMINAL);
  const [deleteTerminal] = useMutation(DELETE_TERMINAL);

  const terminals = data?.biometricTerminals ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BiometricTerminal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BiometricTerminal | null>(null);
  const [form, setForm] = useState(EMPTY_TERMINAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setForm(EMPTY_TERMINAL_FORM);
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(t: BiometricTerminal) {
    setForm({ name: t.name, code: t.code ?? "", branchId: t.branchId ?? "", capabilities: t.capabilities, status: t.status });
    setEditing(t);
    setDialogOpen(true);
  }
  function toggleCapability(method: string) {
    setForm((f) => ({
      ...f,
      capabilities: f.capabilities.includes(method) ? f.capabilities.filter((c) => c !== method) : [...f.capabilities, method],
    }));
  }

  async function handleSubmit() {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    if (form.capabilities.length === 0) {
      toast.error("Select at least one verify method");
      return;
    }
    setSubmitting(true);
    try {
      const input = { name: form.name, code: form.code || undefined, branchId: form.branchId || undefined, capabilities: form.capabilities, status: form.status };
      if (editing) {
        await updateTerminal({ variables: { id: editing.id, input } });
        toast.success("Terminal updated");
      } else {
        await createTerminal({ variables: { input } });
        toast.success("Terminal added");
      }
      setDialogOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save terminal");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(t: BiometricTerminal) {
    try {
      await updateTerminal({
        variables: {
          id: t.id,
          input: { name: t.name, code: t.code || undefined, branchId: t.branchId || undefined, capabilities: t.capabilities, status: t.status === "ONLINE" ? "OFFLINE" : "ONLINE" },
        },
      });
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteTerminal({ variables: { id: deleteTarget.id } });
      toast.success("Terminal removed");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove terminal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Biometric Terminals</h2>
          </div>
          <Button size="sm" onClick={openCreate} className={cn("gap-1.5", BUTTON_PRESS)}>
            <Plus className="h-3.5 w-3.5" />
            Add Terminal
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2.5 py-2.5 font-medium">Name</th>
                <th className="px-2.5 py-2.5 font-medium">Branch</th>
                <th className="px-2.5 py-2.5 font-medium">Capabilities</th>
                <th className="px-2.5 py-2.5 font-medium">Status</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && terminals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2.5 py-8 text-center text-muted-foreground">
                    No biometric terminals configured yet.
                  </td>
                </tr>
              )}
              {terminals.map((t) => (
                <tr key={t.id} className="hover:bg-muted/40">
                  <td className="px-2.5 py-2.5">
                    <p className="font-medium text-foreground">{t.name}</p>
                    {t.code && <p className="text-xs text-muted-foreground">{t.code}</p>}
                  </td>
                  <td className="px-2.5 py-2.5 text-muted-foreground">{t.branchName ?? "—"}</td>
                  <td className="px-2.5 py-2.5 text-muted-foreground">{t.capabilities.map((c) => VERIFY_METHOD_LABEL[c] ?? c).join(" & ")}</td>
                  <td className="px-2.5 py-2.5">
                    <Badge tone={t.status === "ONLINE" ? "success" : "muted"} className={cn("cursor-pointer", BUTTON_PRESS)} onClick={() => toggleStatus(t)}>
                      {t.status === "ONLINE" ? "Online" : "Offline"}
                    </Badge>
                  </td>
                  <td className="px-2.5 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className={BUTTON_PRESS} onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New terminal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
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
              <Label>Capabilities</Label>
              <div className="flex flex-wrap gap-1.5">
                {VERIFY_METHODS.map((m) => (
                  <Badge
                    key={m}
                    tone={form.capabilities.includes(m) ? "success" : "muted"}
                    className={cn("cursor-pointer", BUTTON_PRESS)}
                    onClick={() => toggleCapability(m)}
                  >
                    {VERIFY_METHOD_LABEL[m]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add terminal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {deleteTarget?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This terminal will no longer appear in the attendance register's terminal status.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting} className={BUTTON_PRESS}>
              {submitting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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

      <TerminalsCard branches={branches} />

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
