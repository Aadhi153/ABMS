import { useRef, useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { AlertTriangle, ArrowRight, Camera, Loader2, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Button, Card, cn, toast } from "@abms/ui";
import { BUTTON_PRESS } from "../products/form-motion";
import type { EmployeeFormState } from "./employee-form-sections";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const REQUEST_EMPLOYEE_AVATAR_UPLOAD_URL = gql`
  mutation RequestEmployeeAvatarUploadUrl($contentType: String!, $fileSizeBytes: Int!) {
    requestEmployeeAvatarUploadUrl(contentType: $contentType, fileSizeBytes: $fileSizeBytes) {
      uploadUrl
      publicUrl
    }
  }
`;

function initials(first: string, last: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "—";
}

export interface EmployeeLiveRailProps {
  form: EmployeeFormState;
  setForm: (updater: (f: EmployeeFormState) => EmployeeFormState) => void;
  employeeCodePreview: string;
  branchName?: string;
  overallPct: number;
  completedSteps: number;
  totalSteps: number;
  /** Omitted once the last tab is active. */
  nextStep?: { label: string; description: string } | null;
}

/** Sticky right-rail summary shown alongside the New Employee form: a provisional ID-card
 * preview (photo, name, code, branch), the real cross-tab completion meter, and a static
 * compliance reminder. Nothing here is submitted on its own — it just reflects `form` live. */
export function EmployeeLiveRail({
  form,
  setForm,
  employeeCodePreview,
  branchName,
  overallPct,
  completedSteps,
  totalSteps,
  nextStep,
}: EmployeeLiveRailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [requestUploadUrl] = useMutation(REQUEST_EMPLOYEE_AVATAR_UPLOAD_URL);

  const hasName = Boolean(form.firstName || form.lastName);
  const displayName = hasName ? [form.firstName, form.lastName].filter(Boolean).join(" ") : "New Employee";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPEG, or WEBP image");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data } = await requestUploadUrl({ variables: { contentType: file.type, fileSizeBytes: file.size } });
      const { uploadUrl, publicUrl } = data.requestEmployeeAvatarUploadUrl;
      const putResponse = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putResponse.ok) throw new Error("Upload to storage failed");
      setForm((f) => ({ ...f, avatarUrl: publicUrl }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-4">
      <Card className="overflow-hidden p-0">
        <div className="relative h-14 bg-gradient-to-r from-primary via-primary/85 to-primary/70">
          <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            New Joiner
          </span>
        </div>
        <div className="-mt-8 flex flex-col items-start gap-3 p-4">
          <div className="flex w-full items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative"
              disabled={uploading}
              aria-label="Upload photo"
            >
              <Avatar className="h-16 w-16 border-4 border-background shadow-sm">
                {form.avatarUrl && <AvatarImage src={form.avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-base font-semibold">{initials(form.firstName, form.lastName)}</AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100",
                  uploading && "opacity-100",
                )}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </span>
            </button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className={cn("mt-8 shrink-0", BUTTON_PRESS)}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Photo
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />

          <div>
            <p className={cn("text-base font-semibold leading-tight", !hasName && "text-muted-foreground")}>{displayName}</p>
            {form.designation && <p className="mt-0.5 text-xs font-medium text-primary">{form.designation}</p>}
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{employeeCodePreview} · Drafting Profile</p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2">
            <div className="rounded-md border border-border px-2.5 py-1.5">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">Assigned Campus</p>
              <p className={cn("truncate text-xs font-semibold", branchName ? "text-foreground" : "text-muted-foreground")}>{branchName ?? "—"}</p>
            </div>
            <div className="rounded-md border border-border px-2.5 py-1.5">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">Biometric Link</p>
              <p className={cn("truncate text-xs font-semibold", form.biometricId ? "text-success" : "text-muted-foreground")}>
                {form.biometricId ? `Device ID #${form.biometricId}` : "Not linked"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold">Setup Progress</p>
          <p className="font-mono text-sm font-semibold text-primary">{overallPct}%</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${overallPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {completedSteps === totalSteps ? "All onboard milestones complete" : `${completedSteps} of ${totalSteps} total onboard milestones completed`}
        </p>
        {nextStep && (
          <div className="mt-3 flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Next: {nextStep.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{nextStep.description}</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="flex gap-3 border-warning/30 bg-warning-bg p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="text-xs font-semibold text-foreground">Statutory Notice</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Aadhaar and PAN details are mandatory for Step 6 (Salary &amp; CTC Structuring) and generating compliant PF/ESI returns. Ensure
            spelling precisely matches official documents.
          </p>
        </div>
      </Card>
    </div>
  );
}
