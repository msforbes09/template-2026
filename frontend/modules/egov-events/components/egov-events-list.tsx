import Link from "next/link";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { AlertTriangle, ArrowRight, CalendarRange, Eye, FolderKanban, ImageOff, Pencil, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format-date";
import { DeleteEgovEventDialog } from "@/modules/egov-events/components/delete-egov-event-dialog";
import { EgovEventsToolbar } from "@/modules/egov-events/components/egov-events-toolbar";
import type { Paginated } from "@/types/pagination";
import type { AdminEgovEvent } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

const PER_PAGE = 20;

export async function EgovEventsList({
  q,
  isActive,
  isPublished,
  page,
}: {
  q: string;
  isActive: string;
  isPublished: string;
  page: string;
}) {
  await requireAdminSession();

  // egov-events-view browses; editing or deleting an event needs
  // egov-events-manage. projects-view decides whether the project count may
  // REDIRECT to the projects list filtered to the event — without it the
  // destination would only 403, so the count renders inert.
  const [canManage, canViewProjects] = await Promise.all([
    adminCan(PERMISSIONS.egovEventsManage),
    adminCan(PERMISSIONS.projectsView),
  ]);

  const params = new URLSearchParams();
  if (q) params.set("search", q);
  if (isActive === "0" || isActive === "1") params.set("is_active", isActive);
  if (isPublished === "0" || isPublished === "1") params.set("is_published", isPublished);
  params.set("order_by", "starts_at");
  params.set("sort", "desc");
  params.set("page", page);
  params.set("per_page", String(PER_PAGE));

  // Caught rather than thrown — an uncaught throw inside a Suspense-wrapped
  // Server Component doesn't reliably reach error.tsx in this app.
  let response: Paginated<AdminEgovEvent>;
  try {
    response = await apiFetch<Paginated<AdminEgovEvent>>(
      `/egov-events?${params.toString()}`,
      { next: { tags: ["admin-egov-events"] } },
      "admin",
    );
  } catch (err) {
    // These permissions are new and granted separately from projects-*, so a
    // 403 here is the expected state until somebody grants them.
    if (isApiError(err) && err.status === 403) {
      return (
        <EmptyState
          icon={ShieldX}
          title="You don't have access to events"
          description="Ask an administrator to grant you the egov-events-view permission."
        />
      );
    }
    const message = safeErrorMessage(err, "Something went wrong loading events.");
    return (
      <section aria-label="Event list" className="space-y-4">
        <EgovEventsToolbar />
        <EmptyState icon={AlertTriangle} title="Couldn't load events" description={message} />
      </section>
    );
  }

  const events = response.data;
  const meta = response.meta ?? {
    current_page: Number(page) || 1,
    last_page: 1,
    per_page: PER_PAGE,
    total: events.length,
    from: events.length ? 1 : null,
    to: events.length || null,
  };

  return (
    <section aria-label="Event list" className="space-y-4">
      <EgovEventsToolbar />
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No events yet"
          description="An event is a programme projects are entered into, like a hackathon."
        />
      ) : (
        <>
          <ul className="overflow-hidden rounded-xl border border-border">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-card p-5 first:border-t-0"
              >
                <div className="flex min-w-0 items-center gap-4">
                  {event.photo?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote CDN origin, not configured for next/image
                    <img
                      src={event.photo.url}
                      alt=""
                      className="hidden h-14 w-24 shrink-0 rounded-lg border border-border object-cover sm:block"
                    />
                  ) : (
                    <div className="hidden h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground sm:flex">
                      <ImageOff aria-hidden className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{event.name}</h3>
                    <Badge
                      variant="secondary"
                      className={
                        event.is_active === 1
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : undefined
                      }
                    >
                      {event.is_active === 1 ? "Accepting projects" : "Closed"}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={
                        event.is_published === 0
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : undefined
                      }
                    >
                      {event.is_published === 0 ? "Hidden" : "Publicly visible"}
                    </Badge>
                  </div>
                  {/* Shown because the public URL is built from it, and it
                      changes whenever the name is edited. */}
                  <p className="font-mono text-xs text-muted-foreground">/{event.slug}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.starts_at ? formatDate(event.starts_at, "dd MMM yyyy") : "No start date"}
                    {" · "}
                    {event.ends_at ? formatDate(event.ends_at, "dd MMM yyyy") : "No end date"}
                  </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <ProjectsCount event={event} canViewProjects={canViewProjects} />
                  <div className="flex items-center gap-1">
                  {/* One adaptive button, same destination: the page behind it
                      renders the form with egov-events-manage and a read-only
                      view without it. Icon-only, matching the delete button
                      and the roster tables. */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    render={<Link href={`/admin/egov-events/${event.id}`} />}
                    aria-label={`${canManage ? "Edit" : "View"} ${event.name}`}
                  >
                    {canManage ? (
                      <Pencil aria-hidden className="size-4" />
                    ) : (
                      <Eye aria-hidden className="size-4" />
                    )}
                  </Button>
                  {canManage && <DeleteEgovEventDialog id={event.id} name={event.name} />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <PaginationBar meta={meta} />
        </>
      )}
    </section>
  );
}

// Icon + count + arrow, the roles-list Admins treatment: links to the projects
// list filtered to this event when there is somewhere to go — zero never
// links (an empty filtered list is a dead end) and without projects-view the
// destination would only 403; those render the same pair inert, zero dimmed a
// step further. Absent count (older API payload) renders nothing.
function ProjectsCount({
  event,
  canViewProjects,
}: {
  event: AdminEgovEvent;
  canViewProjects: boolean;
}) {
  const count = event.projects_count;
  if (count == null) return null;

  const pair = (
    <>
      <FolderKanban aria-hidden className="size-3.5" />
      {count}
    </>
  );

  if (count === 0 || !canViewProjects) {
    return (
      <span
        className={
          "inline-flex items-center gap-1.5 text-sm tabular-nums " +
          (count === 0 ? "text-muted-foreground/50" : "text-muted-foreground")
        }
      >
        {pair}
        {/* Invisible arrow keeps the pair the same width as linked rows. */}
        <ArrowRight aria-hidden className="invisible size-3.5" />
      </span>
    );
  }

  return (
    <Link
      href={`/admin/projects?egov_event_id=${event.id}`}
      aria-label={`View the ${count} project${count === 1 ? "" : "s"} entered into ${event.name}`}
      className="group inline-flex items-center gap-1.5 rounded-md text-sm tabular-nums text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {pair}
      <ArrowRight
        aria-hidden
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

// Mirrors the list: toolbar, then rows at the same height, then the paginator.
export function EgovEventsListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:max-w-xs" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-44" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-24 border-t border-border bg-muted/20 first:border-t-0" />
        ))}
      </div>
      <div className="h-9 w-full animate-pulse rounded-md bg-muted/50" />
    </div>
  );
}
