import type { Metadata } from "next";
import Link from "next/link";
import { FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Project not found",
  robots: { index: false, follow: false },
};

export default function MyProjectNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <EmptyState
        icon={FolderX}
        title="Project not found"
        description="It may have been deleted, or it belongs to another account."
        action={
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/projects" />}>
            Back to my projects
          </Button>
        }
      />
    </div>
  );
}
