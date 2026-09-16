"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceModal } from "@/components/ui/resource-modal";
import type { ActionResult } from "@/lib/action-result";

function DetailSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      <div className="flex gap-2">
        <div className="h-5 w-14 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-12 animate-pulse rounded-4xl bg-muted" />
      </div>
      <div className="h-9 w-full animate-pulse rounded-lg bg-muted/60" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted/70" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-32 w-full animate-pulse rounded-xl bg-muted/40" />
    </div>
  );
}

// The detail modal every admin log viewer shares. Lists carry only a summary
// row, so the full record is fetched on open through a server action — the
// list would otherwise have to ship every payload, header and response blob
// for rows nobody opens.
//
// Generic over the detail shape: each viewer supplies its own loader and body
// renderer, and everything around them (trigger, open/fetch lifecycle, 401
// handling, 404 copy, skeleton) is identical and lives here.
export function ViewLogModal<T>({
  title,
  description,
  triggerLabel,
  load,
  renderBody,
  notFoundMessage = "This log is no longer available.",
}: {
  title: string;
  description?: string;
  // Accessible name for the row's eye button — rows all look alike, so this
  // has to identify which one.
  triggerLabel: string;
  load: () => Promise<ActionResult<T>>;
  renderBody: (detail: T) => React.ReactNode;
  notFoundMessage?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fetchDetail() {
    setDetail(null);
    setError(null);

    load().then((result) => {
      if (result.ok) {
        setDetail(result.data);
        return;
      }
      if (result.status === 401) {
        // The session went away underneath us. Close and bounce to the admin
        // sign-in rather than showing an error the admin can't act on.
        setOpen(false);
        router.push("/admin/login");
        return;
      }
      setError(result.status === 404 ? notFoundMessage : result.message);
    });
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={fetchDetail}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={triggerLabel}>
          <Eye aria-hidden className="size-4" />
        </Button>
      }
      title={title}
      description={description}
      contentClassName="sm:max-w-2xl"
    >
      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load this log" description={error} />
      ) : detail ? (
        renderBody(detail)
      ) : (
        <DetailSkeleton />
      )}
    </ResourceModal>
  );
}
