import { useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Label, cn, toast } from "@abms/ui";

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

function matchesAccept(fileType: string, accept: string) {
  return accept.split(",").some((pattern) => {
    pattern = pattern.trim();
    return pattern.endsWith("/*") ? fileType.startsWith(pattern.slice(0, -1)) : fileType === pattern;
  });
}

/** Drag-and-drop image upload with a live thumbnail preview. Reads the file client-side
 * as a data URL — there's no object-storage upload endpoint in this codebase yet. */
export function ImageDropzone({
  label = "Image",
  value,
  onChange,
  helpText = "Drag & drop an image, or click to browse",
  accept = "image/*",
  maxBytes = DEFAULT_MAX_BYTES,
  invalidTypeMessage = "Please choose an image file",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  helpText?: string;
  accept?: string;
  maxBytes?: number;
  invalidTypeMessage?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!matchesAccept(file.type, accept)) {
      toast.error(invalidTypeMessage);
      return;
    }
    if (file.size > maxBytes) {
      toast.error(`Image must be under ${Math.round(maxBytes / (1024 * 1024))}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors duration-150 ease-out",
          dragOver ? "border-primary bg-primary-bg" : "border-border bg-muted/30 hover:bg-muted/50",
        )}
      >
        {value ? (
          <img
            src={value}
            alt="Preview"
            className="h-16 w-16 rounded-md object-cover animate-in fade-in zoom-in-95 duration-200 ease-out motion-reduce:animate-none"
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-xs text-muted-foreground">{value ? "Click or drop to replace" : helpText}</p>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-muted-foreground transition-colors duration-150 hover:text-danger"
        >
          Remove image
        </button>
      )}
    </div>
  );
}
