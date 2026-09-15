"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { CollectionViewer } from "@/modules/api-docs/components/collection-viewer";
import { CodeBlock } from "@/modules/api-docs/components/code-block";
import { asPostmanCollection } from "@/modules/api-docs/lib/postman";
import { getApiCatalog } from "@/modules/api-catalog/actions/api-catalog-actions";
import type { ApiCatalog } from "@/types/api-catalog";

function SpecSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-1 rounded-xl border border-border p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-muted/60" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}

export function ViewSpecModal({ id, identifier }: { id: number; identifier: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<ApiCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function load() {
    setCatalog(null);
    setError(null);
    startTransition(async () => {
      const result = await getApiCatalog(id);
      if (result.ok) {
        setCatalog(result.data);
        return;
      }
      if (result.status === 401) {
        setOpen(false);
        router.push("/admin/login");
        return;
      }
      setError(result.message);
    });
  }

  const spec = catalog?.spec;
  const hasSpec = spec != null && Object.keys(spec).length > 0;
  const collection = hasSpec ? asPostmanCollection(spec) : null;

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={load}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`View ${identifier} spec`}>
          <BookOpen aria-hidden className="size-4" />
        </Button>
      }
      title={catalog?.name ?? identifier}
      description="API specification preview — exactly what developers see in the published docs."
      contentClassName="sm:max-w-[90vw] min-h-[85dvh] max-h-[90dvh]"
    >
      {error ? (
        <EmptyState
          title="Couldn't load this catalog entry"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : !catalog ? (
        <SpecSkeleton />
      ) : !hasSpec ? (
        <EmptyState
          title="No spec uploaded"
          description="This catalog entry has no API specification yet. Specs are managed by the backend."
        />
      ) : collection ? (
        <CollectionViewer collection={collection} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This spec isn&apos;t a Postman collection (it looks like an OpenAPI document), so the
            interactive viewer can&apos;t render it — showing the raw JSON instead.
          </p>
          <CodeBlock label="Raw spec JSON" code={JSON.stringify(spec, null, 2)} />
        </div>
      )}
    </ResourceModal>
  );
}
