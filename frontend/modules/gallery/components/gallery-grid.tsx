import { AlertTriangle, ImageOff } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { requireAdminSession } from "@/lib/auth/dal";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { EmptyState } from "@/components/ui/empty-state";
import { GalleryCard } from "@/modules/gallery/components/gallery-card";
import type { GalleryImage } from "@/types/gallery";
import { safeErrorMessage } from "@/lib/safe-error-message";

export async function GalleryGrid() {
  await requireAdminSession();

  // gallery-view browses; deleting an image needs gallery-manage.
  const canManage = await adminCan(PERMISSIONS.galleryManage);

  // Caught here rather than left to throw into error.tsx — see
  // nextjs16_suspense_error_boundary_bug memory: uncaught throws inside a
  // Suspense-wrapped Server Component never resolve to error.tsx in this app.
  let data: GalleryImage[];
  try {
    const response = await apiFetch<{ data: GalleryImage[] }>(
      "/galleries",
      { next: { tags: ["galleries"] } },
      "admin",
    );
    data = response.data;
  } catch (err) {
    const message = safeErrorMessage(err, "Something went wrong loading the gallery.");
    return <EmptyState icon={AlertTriangle} title="Couldn't load the gallery" description={message} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No images yet"
        description="Upload an image to add it to the gallery."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {data.map((image) => (
        <GalleryCard key={image.uuid} image={image} canDelete={canManage} />
      ))}
    </div>
  );
}
