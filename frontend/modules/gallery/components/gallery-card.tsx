import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteGalleryImageDialog } from "@/modules/gallery/components/delete-gallery-image-dialog";
import { GalleryImagePreviewDialog } from "@/modules/gallery/components/gallery-image-preview-dialog";
import type { GalleryImage } from "@/types/gallery";

export function GalleryCard({
  image,
  // gallery-manage, resolved by the server grid — the delete affordance is
  // withheld without it.
  canDelete,
}: {
  image: GalleryImage;
  canDelete: boolean;
}) {
  const name = image.original_name ?? "Untitled image";

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
      <GalleryImagePreviewDialog
        image={image}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Preview ${name}`}
            className="size-full rounded-none p-0"
          >
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote CDN origin, not configured for next/image
              <img src={image.url} alt={name} className="size-full object-contain" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ImageOff aria-hidden className="size-6" />
              </div>
            )}
          </Button>
        }
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-black/70 to-transparent p-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <p className="truncate text-xs text-white" title={name}>
          {name}
        </p>
        {canDelete && (
          <DeleteGalleryImageDialog uuid={image.uuid} name={name} className="pointer-events-auto" />
        )}
      </div>
    </div>
  );
}
