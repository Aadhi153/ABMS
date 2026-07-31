import { useState } from "react";
import { Button, Input, Label, toast } from "@abms/ui";
import { Plus, X } from "lucide-react";

interface InlineEntityCreateProps {
  kind: "contact" | "company";
  onCreated: (id: string, label: string) => void;
  create: (input: Record<string, string | undefined>) => Promise<{ id: string } | null | undefined>;
}

export function InlineEntityCreate({ kind, onCreated, create }: InlineEntityCreateProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        Create new {kind}
      </button>
    );
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const input = kind === "contact" ? { name, email: extra || undefined } : { name, industry: extra || undefined };
      const result = await create(input);
      if (result?.id) {
        onCreated(result.id, name);
        toast.success(`${name} added`);
        setOpen(false);
        setName("");
        setExtra("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to create ${kind}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">New {kind === "contact" ? "contact" : "company"}</Label>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input
        autoFocus
        placeholder={kind === "contact" ? "Full name" : "Company name"}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder={kind === "contact" ? "Email (optional)" : "Industry (optional)"}
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
      />
      <Button type="button" size="sm" disabled={!name.trim() || submitting} onClick={handleCreate}>
        {submitting ? "Adding…" : `Add ${kind}`}
      </Button>
    </div>
  );
}
