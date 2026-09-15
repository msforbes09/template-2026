"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { AlertTriangle, ImageOff, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { swrFetcher } from "@/lib/swr-fetcher";
import { uploadGalleryImage } from "@/modules/gallery/actions/gallery-actions";
import type { GalleryImage } from "@/types/gallery";

// Single-purpose picker: get one image's URL out of the gallery and back to
// the caller. No delete/manage affordances here — that's what /admin/gallery
// is for; this dialog just needs to insert something and close.
export function GalleryImagePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (image: GalleryImage) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Keyed off `open` so it only fetches while the dialog is actually visible.
  const { data, error, isLoading, mutate } = useSWR<{ data: GalleryImage[] }>(
    open ? "/api/galleries" : null,
    swrFetcher,
  );

  function choose(image: GalleryImage) {
    onSelect(image);
    onOpenChange(false);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so selecting the same file again still fires onChange
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadGalleryImage(formData);
    setUploading(false);

    if (result.ok) {
      void mutate();
      choose(result.data);
    } else {
      toast.error(result.message);
    }
  }

  const images = (data?.data ?? []).filter((image) => image.url);

  return (
    <ResourceModal
      open={open}
      onOpenChange={onOpenChange}
      title="Insert image"
      description="Pick an image from the gallery, or upload a new one."
      contentClassName="sm:max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden className="size-4" />
            )}
            {uploading ? "Uploading…" : "Upload new image"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void handleUpload(event)}
          />
        </div>

        {isLoading ? (
          <div
            className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4"
            aria-hidden
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load the gallery"
            description={error instanceof Error ? error.message : "Something went wrong."}
          />
        ) : images.length === 0 ? (
          <EmptyState
            icon={ImageOff}
            title="No images yet"
            description="Upload an image above to add it to the gallery."
          />
        ) : (
          <div className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {images.map((image) => (
              <button
                key={image.uuid}
                type="button"
                onClick={() => choose(image)}
                aria-label={image.original_name ?? "Untitled image"}
                className="aspect-square overflow-hidden rounded-lg border border-border transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN origin, not configured for next/image */}
                <img
                  src={image.url ?? undefined}
                  alt={image.original_name ?? "Untitled image"}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </ResourceModal>
  );
}
