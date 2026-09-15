"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ImageOff, Loader2, Upload, UserRound, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CameraCaptureDialog } from "@/modules/uploads/components/camera-capture-dialog";
import { uploadPrivateFile, uploadPublicFile } from "@/modules/uploads/actions/upload-actions";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { UploadedFile } from "@/types/upload";

// Shared uploader for the Common API's Files endpoints. `visibility`
// determines which default action gets called: "private" for sensitive/
// authenticated-only files (signed, expiring URL — e.g. an administrator's
// photo), "public" for files meant to be publicly reachable (permanent CDN
// URL). Pass `uploadAction` to use a different audience's upload action
// (e.g. the client-audience registration wizard) instead of the admin
// default.
export function FileUploader({
  visibility,
  value,
  onChange,
  accept,
  id,
  uploadAction,
  captureOnly,
  hint,
  preview = "avatar",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  visibility: "public" | "private";
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  accept?: string;
  id?: string;
  uploadAction?: (formData: FormData) => Promise<ActionResult<UploadedFile>>;
  // Replaces the native file picker with a camera-capture dialog entirely
  // (no "Upload" button, no <input type="file"> in the DOM) — opt-in per
  // call site (the registration wizard's selfie-style profile photo,
  // where a picked HEIC photo from an iPhone's library can fail backend
  // processing) rather than a default for every FileUploader usage (the
  // admin administrator-photo field keeps the native picker).
  captureOnly?: boolean;
  // Guidance line shown inside the capture tile (capture mode only).
  hint?: string;
  // How an uploaded image is previewed (non-capture mode): the default
  // avatar thumbnail, or a full-width "banner" (wide cover images — the
  // gallery image — where a circle crop misrepresents the file).
  preview?: "avatar" | "banner";
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);

  function uploadFile(file: File) {
    setError(null);
    const maxBytes = env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File is too large. Maximum size is ${env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB}MB.`);
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const upload = uploadAction ?? (visibility === "private" ? uploadPrivateFile : uploadPublicFile);
      const result = await upload(formData);
      if (result.ok) {
        onChange(result.data);
      } else {
        setError(result.message);
      }
    });
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so selecting the same file again still fires onChange
    if (!file) return;
    uploadFile(file);
  }

  const isImage = value?.mime_type.startsWith("image/") ?? false;

  const removeButton = value && !isPending && (
    <Button
      type="button"
      variant="ghost"
      size={captureOnly ? "icon" : "icon-sm"}
      aria-label="Remove file"
      onClick={() => onChange(null)}
    >
      <X aria-hidden className="size-3.5" />
    </Button>
  );

  return (
    <div className="space-y-2">
      {captureOnly ? (
        <div className="flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
          <Avatar className="size-16">
            {isImage && value && <AvatarImage src={value.url} alt="Captured profile photo" />}
            <AvatarFallback className="bg-background">
              <UserRound aria-hidden className="size-7 text-muted-foreground/70" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{value ? "Photo captured" : "No photo yet"}</p>
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 bg-background"
                disabled={isPending}
                onClick={() => setCaptureOpen(true)}
                aria-describedby={ariaDescribedBy}
              >
                {isPending ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <Camera aria-hidden className="size-3.5" />
                )}
                {isPending ? "Uploading…" : value ? "Retake photo" : "Take photo"}
              </Button>
              {removeButton}
            </div>
          </div>
        </div>
      ) : (
        <div className={preview === "banner" ? "flex flex-col gap-3" : "flex items-center gap-3"}>
          {preview === "banner" ? (
            isImage && value ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote CDN origin, not configured for next/image
              <img
                src={value.url}
                alt={value.original_name}
                className="aspect-[3/1] w-full rounded-xl border border-border object-cover"
              />
            ) : (
              <div className="flex aspect-[3/1] w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground">
                <ImageOff aria-hidden className="size-6" />
              </div>
            )
          ) : (
            <Avatar size="lg">
              {isImage && value && <AvatarImage src={value.url} alt={value.original_name} />}
              <AvatarFallback>
                <ImageOff aria-hidden className="size-4" />
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
                aria-describedby={ariaDescribedBy}
              >
                {isPending ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <Upload aria-hidden className="size-3.5" />
                )}
                {isPending ? "Uploading…" : value ? "Replace" : "Upload"}
              </Button>
              {removeButton}
            </div>
            {value && !isPending && (
              <p
                className="max-w-56 truncate text-xs text-muted-foreground"
                title={value.original_name}
              >
                {value.original_name}
              </p>
            )}
          </div>
        </div>
      )}
      {!captureOnly && (
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          aria-invalid={ariaInvalid}
          onChange={handleFileSelected}
        />
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      {captureOnly && captureOpen && (
        <CameraCaptureDialog onOpenChange={setCaptureOpen} onCapture={uploadFile} />
      )}
    </div>
  );
}
