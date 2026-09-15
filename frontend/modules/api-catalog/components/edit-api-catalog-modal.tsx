"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResourceModal } from "@/components/ui/resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiCatalogForm } from "@/modules/api-catalog/components/api-catalog-form";
import { Markdown } from "@/components/ui/markdown";
import { EditApiCatalogModalSkeleton } from "@/modules/api-catalog/components/edit-api-catalog-modal-skeleton";
import { getApiCatalog, updateApiCatalog } from "@/modules/api-catalog/actions/api-catalog-actions";
import type { ApiCatalog } from "@/types/api-catalog";

export function EditApiCatalogModal({
  id,
  identifier,
  // Without api-catalogs-manage the same modal opens as a read-only view —
  // the row's one entry point to the full description, Body and Meta, which
  // otherwise exist only inside this form. Same fetch either way: the show
  // endpoint needs only api-catalogs-view.
  readOnly = false,
}: {
  id: number;
  identifier: string;
  readOnly?: boolean;
}) {
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

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={load}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${readOnly ? "View" : "Edit"} ${identifier}`}
        >
          {readOnly ? (
            <Eye aria-hidden className="size-4" />
          ) : (
            <Pencil aria-hidden className="size-4" />
          )}
        </Button>
      }
      title={readOnly ? "API catalog entry" : "Edit API catalog entry"}
      description={
        readOnly
          ? "Read-only — editing needs the api-catalogs-manage permission."
          : "Identifier and spec are managed by the backend — only the documentation fields are editable."
      }
      contentClassName="sm:max-w-[80vw] min-h-[80dvh] max-h-[90dvh]"
    >
      {error ? (
        <EmptyState
          title="Couldn't load this catalog entry"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : catalog ? (
        readOnly ? (
          <ApiCatalogDetails catalog={catalog} />
        ) : (
        <ApiCatalogForm
          submitLabel="Save changes"
          defaultValues={{
            name: catalog.name ?? "",
            description: catalog.description ?? "",
            body: catalog.body ?? "",
            meta: catalog.meta ? JSON.stringify(catalog.meta, null, 2) : "",
          }}
          onSubmit={(values) => updateApiCatalog(id, values)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
            toast.success("Catalog entry updated");
          }}
        />
        )
      ) : (
        <EditApiCatalogModalSkeleton />
      )}
    </ResourceModal>
  );
}

// The read-only counterpart of ApiCatalogForm — the same fields as text. The
// Body renders through the shared Markdown component, exactly as the editor's
// preview pane (and the public docs page) renders it.
function ApiCatalogDetails({ catalog }: { catalog: ApiCatalog }) {
  return (
    <div className="space-y-6">
      <DetailField label="Name">
        <p className="text-sm">{catalog.name ?? catalog.identifier}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{catalog.identifier}</p>
      </DetailField>

      <DetailField label="Description">
        {catalog.description ? (
          <p className="whitespace-pre-wrap text-sm">{catalog.description}</p>
        ) : (
          <Unset />
        )}
      </DetailField>

      <DetailField label="Body">
        {catalog.body?.trim() ? (
          <div className="rounded-lg border border-border p-4">
            <Markdown>{catalog.body}</Markdown>
          </div>
        ) : (
          <Unset />
        )}
      </DetailField>

      <DetailField label="Meta">
        {catalog.meta ? (
          <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
            {JSON.stringify(catalog.meta, null, 2)}
          </pre>
        ) : (
          <Unset />
        )}
      </DetailField>
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

function Unset() {
  return <p className="text-sm text-muted-foreground">—</p>;
}
