import { AlertTriangle, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentsToolbar } from "@/modules/content/components/contents-toolbar";
import { ContentsPagination } from "@/modules/content/components/contents-pagination";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import {
  contentColumns,
  contentColumnsReadOnly,
} from "@/modules/content/components/content-columns";
import type { Content } from "@/types/content";

const PER_PAGE = 20;

export async function ContentsList({ q, page }: { q: string; page: string }) {
  await requireAdminSession();

  // contents-view gets the list read-only; the write actions need
  // contents-manage. Both column sets are client-module exports, so the
  // server picks a reference rather than filtering the defs itself.
  const canManage = await adminCan(PERMISSIONS.contentsManage);

  const params = new URLSearchParams();
  if (q) params.set("search", q);
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught here rather than left to throw into error.tsx — see
  // nextjs16_suspense_error_boundary_bug memory: uncaught throws inside a
  // Suspense-wrapped Server Component never resolve to error.tsx in this app.
  let data: Content[];
  try {
    const response = await apiFetch<{ data: Content[] }>(
      `/contents?${params.toString()}`,
      { next: { tags: ["contents"] } },
      "admin",
    );
    data = response.data;
  } catch (err) {
    const message = isApiError(err) ? err.message : "Something went wrong loading content blocks.";
    return (
      <section aria-label="Content block list" className="space-y-4">
        <ContentsToolbar />
        <EmptyState icon={AlertTriangle} title="Couldn't load content blocks" description={message} />
      </section>
    );
  }

  const currentPage = Number(page) || 1;
  const hasNextPage = data.length === PER_PAGE;

  return (
    <section aria-label="Content block list" className="space-y-4">
      <ContentsToolbar />
      {data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content blocks found"
          description="Try a different search, or add a new content block."
        />
      ) : (
        <>
          <DataTable columns={canManage ? contentColumns : contentColumnsReadOnly} data={data} />
          <ContentsPagination currentPage={currentPage} hasNextPage={hasNextPage} />
        </>
      )}
    </section>
  );
}
