import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, Scale } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarOff } from "lucide-react";
import { PublicProjectsGrid } from "@/modules/projects/components/public-projects-grid";
import { PublicProjectsGridSkeleton } from "@/modules/projects/components/public-projects-grid-skeleton";
import { PublicProjectsTabs } from "@/modules/projects/components/public-projects-tabs";
import { EventSwitcher } from "@/modules/projects/components/event-switcher";
import { EventSummary } from "@/modules/projects/components/event-summary";
import { getEgovEvents, resolveEgovEvent } from "@/modules/projects/lib/get-public-projects";
import { eventCustomTags } from "@/types/project";
import { eventCriteriaLink } from "@/modules/projects/lib/event-criteria";

export type PublicProjectsSearchParams = Promise<{
  search?: string;
  egov_api?: string;
  tech?: string;
  tag?: string;
  event?: string;
  sort?: string;
  page?: string;
}>;

// Everything that depends on the request lives here, inside the boundary: the
// event list, the resolved event, and the grid. The page shell above stays
// statically prerenderable.
async function EventProjectsSection({
  searchParams,
}: {
  searchParams: PublicProjectsSearchParams;
}) {
  const {
    search = "",
    egov_api = "",
    tech = "",
    tag = "",
    event: eventSlug,
    sort = "",
    page = "1",
  } = await searchParams;

  // Published only — the switcher must not offer an event whose project list
  // 404s. Past events ARE offered: their entries stay browsable, and the
  // switcher groups them under "Past".
  const [events, event] = await Promise.all([
    getEgovEvents({ isPublished: true }),
    resolveEgovEvent(eventSlug),
  ]);

  // No active event at all is a real state on a portal between programmes,
  // and reads better than an empty grid under a heading.
  if (!event) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="No event is running right now"
        description="Published projects appear here once the next programme opens."
      />
    );
  }

  const criteria = eventCriteriaLink(event);

  return (
    <div className="space-y-8">
      {/* Leads the section: which event these entries belong to, when it ran
          and whether it is still open. The controls below act on what this
          names, so it reads top-down. */}
      <EventSummary event={event} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Only worth showing once there is a choice to make. */}
        {events.length > 1 && <EventSwitcher events={events} current={event.slug} />}
        {/* This event's own curation labels, in the order an admin put them
            in. Renders nothing for an event that curates nothing. */}
        <PublicProjectsTabs tags={eventCustomTags(event)} />
        {/* Sourced from the event's Extras, so switching events shows that
            event's rubric — and no link at all when it hasn't published one,
            rather than pointing at a different programme's criteria. */}
        {criteria && (
          <Link
            href={criteria.href}
            {...(criteria.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Scale aria-hidden className="size-4" />
            How entries are judged
            {criteria.external && <ExternalLink aria-hidden className="size-3.5" />}
          </Link>
        )}
      </div>

      <PublicProjectsGrid
        slug={event.slug}
        event={event}
        search={search}
        egovApi={egov_api}
        tech={tech}
        tag={tag}
        sort={sort}
        page={page}
      />
    </div>
  );
}

// Not `async` on purpose — the searchParams promise is forwarded unread so the
// heading and blurb stay in the static shell.
export function PublicProjectsPage({
  title,
  kicker,
  description,
  searchParams,
}: {
  title: React.ReactNode;
  kicker: string;
  description: string;
  searchParams: PublicProjectsSearchParams;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{kicker}</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
      </header>
      <div className="mt-10">
        <Suspense fallback={<PublicProjectsGridSkeleton />}>
          <EventProjectsSection searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
