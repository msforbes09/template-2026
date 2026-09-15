import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Reached via notFound() when the identifier is unknown or the catalog has
// been deactivated — the response carries a real 404 status, so a delisted
// service drops out of the index instead of lingering as a 200.
export const metadata: Metadata = {
  title: "API not found",
  robots: { index: false, follow: false },
};

export default function PublicApiCatalogNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">This API isn&apos;t available</h1>
      <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
        The API you&apos;re looking for doesn&apos;t exist, or it isn&apos;t published on the
        developer portal right now.
      </p>
      <Button nativeButton={false} render={<Link href="/#catalog" />}>
        Browse all services
      </Button>
    </div>
  );
}
