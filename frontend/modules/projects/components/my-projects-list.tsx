import Link from "next/link";
import { AlertTriangle, FolderPlus, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireClientSession } from "@/lib/auth/dal";
import { MyProjectCard } from "@/modules/projects/components/my-project-card";
import { MyProjectsToolbar } from "@/modules/projects/components/my-projects-toolbar";
import { getProjectTags } from "@/modules/projects/lib/get-public-projects";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canCreateProjects } from "@/modules/client-auth/lib/account";
import { DeveloperOnlyNotice } from "@/modules/client-auth/components/developer-only-notice";
import type { Paginated } from "@/types/pagination";
import type { ProjectListItem } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

const PER_PAGE = 12;

export async function MyProjectsList({
  q,
  status,
  page,
}: {
  q: string;
  status: string;
  page: string;
}) {
  await requireClientSession();

  // Managing projects is developer-only. The API does NOT error for a basic
  // account — GET user/projects just returns an empty list — so without this
  // the page would read "you haven't entered a project yet" beside a create
  // button the API would refuse.
  const profile = await getClientProfile();
  if (profile && !canCreateProjects(profile)) {
    return <DeveloperOnlyNotice profile={profile} what="Entering projects" />;
  }

  const params = new URLSearchParams();
  if (q) params.set("search", q);
  if (status) params.set("status", status);
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught rather than thrown: an uncaught throw inside a Suspense-wrapped
  // Server Component doesn't reliably reach error.tsx in this app (see
  // ApiCatalogsList). It also lets the one expected failure — an account
  // that isn't approved yet — render as its own state instead of an error.
  let response: Paginated<ProjectListItem>;
  try {
    response = await apiFetch<Paginated<ProjectListItem>>(
      `/projects?${params.toString()}`,
      { next: { tags: ["my-projects"] } },
      "client",
    );
  } catch (err) {
    // The API answers 403 `account_pending` until an admin approves the
    // account. That's a normal state for a new registrant, not a fault.
    if (isApiError(err) && err.status === 403 && err.code === "account_pending") {
      return (
        <EmptyState
          icon={Lock}
          title="Your account is still being reviewed"
          description="Once it's approved you'll be able to enter a project into the showcase."
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
              Back to dashboard
            </Button>
          }
        />
      );
    }
    const message = safeErrorMessage(err, "Something went wrong loading your projects.");
    return (
      <section aria-label="Your projects" className="space-y-4">
        <MyProjectsToolbar />
        <EmptyState icon={AlertTriangle} title="Couldn't load your projects" description={message} />
      </section>
    );
  }

  const catalog = await getProjectTags();
  const projects = response.data;
  // Same defensive fallback as the other paginated lists — the envelope is
  // Laravel's paginator, but nothing validates the response shape at runtime.
  const meta = response.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: PER_PAGE,
    total: projects.length,
    from: projects.length ? 1 : null,
    to: projects.length || null,
  };
  const isFiltered = !!q || !!status;

  return (
    <section aria-label="Your projects" className="space-y-4">
      <MyProjectsToolbar />
      {projects.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={FolderPlus}
            title="No projects match those filters"
            description="Try a different search or status."
          />
        ) : (
          <EmptyState
            icon={FolderPlus}
            title="You haven't entered a project yet"
            description="Tell us what you built with the eGov APIs, and pick the event you're entering it into. You can keep editing it until you submit it for review."
            action={
              <Button
                nativeButton={false}
                render={<Link href="/dashboard/projects/new" />}
                className="gap-1.5"
              >
                <Plus aria-hidden className="size-4" />
                New project
              </Button>
            }
          />
        )
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.uuid} className="flex">
                <MyProjectCard project={project} catalog={catalog} />
              </li>
            ))}
          </ul>
          <PaginationBar meta={meta} />
        </>
      )}
    </section>
  );
}
