import type { Metadata } from "next";
import Link from "next/link";
import { FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// noindex because this can render with a 200: the prerendered fallback shell
// flushes its status before the page body calls notFound(), so a crawler
// would otherwise index a soft 404. (`dynamicParams = false`, the usual fix,
// is rejected outright by cacheComponents.)
export const metadata: Metadata = {
  title: "Project not found",
  robots: { index: false, follow: false },
};

export default function PublicProjectNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <EmptyState
        icon={FolderX}
        title="Project not found"
        description="This project isn't published, or it may have been removed from the showcase."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/projects" />}>
            Browse all projects
          </Button>
        }
      />
    </div>
  );
}
