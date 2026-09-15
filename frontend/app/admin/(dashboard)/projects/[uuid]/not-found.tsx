import type { Metadata } from "next";
import Link from "next/link";
import { FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Project not found",
  robots: { index: false, follow: false },
};

export default function AdminProjectNotFound() {
  return (
    <EmptyState
      icon={FolderX}
      title="Project not found"
      description="It may have been deleted."
      action={
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/projects" />}>
          Back to projects
        </Button>
      }
    />
  );
}
