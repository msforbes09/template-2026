"use client";

import { useState } from "react";
import { ImageOff, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import type { GalleryImage } from "@/types/gallery";

const ZOOM_STEP = 0.25;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export function GalleryImagePreviewDialog({
  image,
  trigger,
}: {
  image: GalleryImage;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const name = image.original_name ?? "Untitled image";

  // Zoom is a per-view session, not something that should persist across
  // closing and reopening (or switching to a different image's dialog) —
  // reset it wherever the dialog closes, rather than via an effect on `open`
  // (which would cause a same-render cascading setState).
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setScale(1);
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={name}
      showCloseButton={false}
      contentClassName="sm:max-w-[90vw] max-h-[90dvh]"
    >
      {/* Bleeds to the dialog's edges (like DialogFooter's own -mx-4 -mb-4) so the
          image isn't boxed inside another card — just a toolbar above it. */}
      <div className="-mx-4 -mb-4 flex flex-col overflow-hidden rounded-b-xl border-t border-border">
        <div
          role="toolbar"
          aria-label="Image actions"
          className="flex items-center justify-end gap-1 bg-muted/40 p-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            disabled={scale <= MIN_SCALE}
            onClick={() => setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP))}
          >
            <ZoomOut aria-hidden className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            disabled={scale >= MAX_SCALE}
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP))}
          >
            <ZoomIn aria-hidden className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => handleOpenChange(false)}
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
        <div className="flex max-h-[70dvh] items-center justify-center overflow-auto bg-muted/20 p-4">
          {image.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote CDN origin, not configured for next/image
            <img
              src={image.url}
              alt={name}
              style={{ transform: `scale(${scale})` }}
              className="max-h-[70dvh] max-w-full object-contain transition-transform"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-muted-foreground">
              <ImageOff aria-hidden className="size-8" />
            </div>
          )}
        </div>
      </div>
    </ResourceModal>
  );
}
