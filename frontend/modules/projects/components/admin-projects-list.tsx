import { AlertTriangle, FolderKanban, ShieldX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { AdminProjectsTable } from "@/modules/projects/components/admin-projects-table";
import { AdminProjectsToolbar } from "@/modules/projects/components/admin-projects-toolbar";
import { getProjectTags } from "@/modules/projects/lib/get-public-projects";
import { getEgovEventOptions } from "@/modules/egov-events/actions/egov-event-actions";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import type { Paginated } from "@/types/pagination";
import type { AdminProjectListItem } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

const PER_PAGE = 20;

export async function AdminProjectsList({
  q,
  status,
  isPublished,
  isAssessmentStarted,
  claimed,
  egovEventId,
  page,
}: {
  q: string;
  status: string;
  isPublished: string;
  isAssessmentStarted: string;
  claimed: string;
  egovEventId: string;
  page: string;
}) {
  await requireAdminSession();

  const params = new URLSearchParams();
  if (q) params.set("search", q);
  if (status) params.set("status", status);
  if (isPublished === "0" || isPublished === "1") params.set("is_published", isPublished);
  if (isAssessmentStarted === "0" || isAssessmentStarted === "1") {
    params.set("is_assessment_started", isAssessmentStarted);
  }
  // ?claimed=me narrows to the one project THIS admin holds the claim on —
  // the users list's rhythm. The profile read is cache()-memoized, so the
  // later Promise.all reuses it. An unresolvable profile filters on id 0:
  // an empty list, the honest answer when we can't say who "me" is.
  if (claimed === "me") {
    const me = await getAdminProfile();
    params.set("is_assessment_started", "1");
    params.set("assessment_started_by_id", String(me?.id ?? 0));
  }
  if (egovEventId) params.set("egov_event_id", egovEventId);
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught rather than thrown — an uncaught throw inside a Suspense-wrapped
  // Server Component doesn't reliably reach error.tsx in this app.
  let response: Paginated<AdminProjectListItem>;
  try {
    response = await apiFetch<Paginated<AdminProjectListItem>>(
      `/projects?${params.toString()}`,
      { next: { tags: ["admin-projects"] } },
      "admin",
    );
  } catch (err) {
    // An admin without `projects-view` gets 403 — an access problem, not a
    // fault, and worth naming so they know to ask for the permission.
    if (isApiError(err) && err.status === 403) {
      return (
        <EmptyState
          icon={ShieldX}
          title="You don't have access to projects"
          description="Ask an administrator to grant you the projects-view permission."
        />
      );
    }
    const message = safeErrorMessage(err, "Something went wrong loading projects.");
    return (
      <section aria-label="Project list" className="space-y-4">
        <AdminProjectsToolbar />
        <EmptyState icon={AlertTriangle} title="Couldn't load projects" description={message} />
      </section>
    );
  }

  // The profile read is cache()-memoized per request, so it and the adminCan
  // check cost one fetch between them; the id tells the actions pin which
  // claim is yours, canManage decides whether that pin is offered at all.
  const [catalog, events, profile, canManage] = await Promise.all([
    getProjectTags(),
    getEgovEventOptions(),
    getAdminProfile(),
    adminCan(PERMISSIONS.projectsManage),
  ]);
  const projects = response.data;
  const meta = response.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: PER_PAGE,
    total: projects.length,
    from: projects.length ? 1 : null,
    to: projects.length || null,
  };

  return (
    <section aria-label="Project list" className="space-y-4">
      <AdminProjectsToolbar events={events} />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects here"
          description={
            status === "for_assessment"
              ? "Nothing is waiting to be assessed right now."
              : status === "for_publishing"
                ? "Nothing is waiting to be published right now."
                : status.includes(",")
                  ? "No live project has an update awaiting review right now."
                  : "Try a different search or filter."
          }
        />
      ) : (
        <>
          <AdminProjectsTable
            data={projects}
            catalog={catalog}
            currentAdminId={profile?.id ?? null}
            canManage={canManage}
            statusFilter={status}
          />
          <PaginationBar meta={meta} />
        </>
      )}
    </section>
  );
}
