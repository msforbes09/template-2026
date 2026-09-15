import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Can } from "@/modules/admin/components/can";
import { PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { UploadGalleryImageButton } from "@/modules/gallery/components/upload-gallery-image-button";
import { GalleryGrid } from "@/modules/gallery/components/gallery-grid";
import { GalleryGridSkeleton } from "@/modules/gallery/components/gallery-grid-skeleton";

export const metadata: Metadata = {
  title: "Gallery",
  robots: { index: false, follow: false },
};

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gallery"
        description="Manage the images shown across the site."
        action={
          <Can permission={PERMISSIONS.galleryManage}>
            <UploadGalleryImageButton />
          </Can>
        }
      />
      <Suspense fallback={<GalleryGridSkeleton />}>
        <GalleryGrid />
      </Suspense>
    </div>
  );
}
