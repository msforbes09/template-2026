import { GalleryGridSkeleton } from "@/modules/gallery/components/gallery-grid-skeleton";

export default function GalleryLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
      <GalleryGridSkeleton />
    </div>
  );
}
