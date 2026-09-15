"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadGalleryImage } from "@/modules/gallery/actions/gallery-actions";

export function UploadGalleryImageButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // reset so selecting the same file(s) again still fires onChange
    if (files.length === 0) return;

    setUploading(true);
    const results = await Promise.all(
      files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        return uploadGalleryImage(formData);
      }),
    );
    setUploading(false);

    const failures = results.filter((result) => !result.ok);
    const uploaded = results.length - failures.length;

    if (uploaded > 0) {
      router.refresh();
      toast.success(uploaded === 1 ? "Image uploaded" : `${uploaded} images uploaded`);
    }
    failures.forEach((failure) => {
      if (!failure.ok) toast.error(failure.message);
    });
  }

  return (
    <>
      <Button
        type="button"
        className="gap-2"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <Upload aria-hidden className="size-4" />
        )}
        {uploading ? "Uploading…" : "Upload image"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => void handleFilesSelected(event)}
      />
    </>
  );
}
