import Link from "next/link";
import { ArrowRight, ExternalLink, Scale, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { PublicProjectCard } from "@/modules/projects/components/public-project-card";
import {
  getEventProjects,
  getProjectTags,
  resolveEgovEvent,
} from "@/modules/projects/lib/get-public-projects";
import { eventCriteriaLink } from "@/modules/projects/lib/event-criteria";
import { mergeEventTags } from "@/modules/projects/lib/project-tags";
import { eventDateRange } from "@/modules/projects/lib/event-schedule";
import { eventCustomTags, isEventActive } from "@/types/project";
import type { ProjectTag, PublicProjectListItem } from "@/types/project";

// The hackathon's showcase on the landing page: the judges' TOP 30 when
// there is one, otherwise the newest published entries. Renders nothing at
// all while nothing is published — an empty "Hackathon" band above the fold
// is worse than no band, and the section only earns its place once there's
// something to show.
export async function HackathonShowcase() {
  // Public reads, so no session guard (see get-public-projects.ts). Nothing
  // here can reject: this section is on a prerendered page, and a rejection
  // out of a cached read fails the build rather than degrading.
  const [event, globalTags] = await Promise.all([resolveEgovEvent(), getProjectTags()]);

  // Whichever event actually has entries — a freshly created empty one would
  // otherwise blank the band while the previous event's projects sat unshown.
  if (!event) return null;

  // The event's own headline curation label, rather than a hardcoded "TOP 30"
  // that only one programme was ever going to have.
  //
  // Walks the admin's order and takes the first label that actually has
  // entries, rather than the first label full stop: an event whose leading
  // tag is "TOP 5" but has only judged its TOP 30 so far should still lead
  // with something. Bounded for the same reason the event walk above is —
  // these are cached, but a runaway loop over 20 labels is not worth risking.
  let headline: ProjectTag | null = null;
  let projects: PublicProjectListItem[] = [];

  for (const tag of eventCustomTags(event).slice(0, 3)) {
    const curated = await getEventProjects(event.slug, { tag: tag.name, page: "1" });
    if (curated.ok && curated.page.data.length > 0) {
      headline = tag;
      projects = curated.page.data;
      break;
    }
  }

  let isCurated = projects.length > 0;

  if (projects.length === 0) {
    const all = await getEventProjects(event.slug, { page: "1" });
    projects = all.ok ? all.page.data : [];
    isCurated = false;
  }

  if (projects.length === 0) return null;

  // Three across on desktop, so the row is always full.
  // The curated labels these cards carry live on the event, not in the
  // global catalogue — merge or they render as neutral chips.
  const catalog = mergeEventTags(globalTags, event);
  const featured = projects.slice(0, 3);
  const criteria = eventCriteriaLink(event);
  const when = eventDateRange(event);

  return (
    <section id="hackathon" className="relative overflow-hidden bg-background">
      <div className="relative mx-auto w-full max-w-[1600px] px-6 sm:px-9 lg:px-16">
        <div className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-border sm:left-9 md:block lg:left-16" />
        <div className="pointer-events-none absolute right-6 top-0 hidden h-full w-px bg-border sm:right-9 md:block lg:right-16" />

        <div className="relative border-x border-border">
          <Reveal className="grid gap-8 border-y border-border px-6 pb-16 pt-16 sm:px-8 md:grid-cols-[1fr_0.72fr] md:items-end lg:px-16 lg:py-24">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.04em] text-primary">
                <Trophy aria-hidden className="size-4" />
                {event.name}
              </div>
              <h2 className="max-w-[640px] text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {isCurated && headline ? (
                  <>
                    The <span className="text-primary">{headline.name}</span> built on
                    these APIs.
                  </>
                ) : (
                  <>
                    What teams are <span className="text-primary">building</span> with these APIs.
                  </>
                )}
              </h2>
            </div>
            <div className="max-w-[430px] md:justify-self-end">
              <p className="text-base leading-7 text-muted-foreground">
                Real integrations from {event.name}. Each one lists the services it
                connects to, with a demo you can watch.
              </p>
              {when && (
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  {when}
                  {/* Stated as text, not implied by a colour or a past tense. */}
                  <span className="text-muted-foreground/70">
                    {isEventActive(event) ? " · open for entries" : " · closed"}
                  </span>
                </p>
              )}
            </div>
          </Reveal>

          <div className="border-b border-border px-6 py-12 sm:px-8 lg:px-16 lg:py-16">
            <Reveal>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((project: PublicProjectListItem) => (
                  <li key={project.uuid} className="flex">
                    <PublicProjectCard project={project} catalog={catalog} />
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-3">
              <Button
                nativeButton={false}
                className="h-12 gap-2 px-6"
                render={<Link href="/projects" />}
              >
                Browse all projects
                <ArrowRight aria-hidden className="size-4" />
              </Button>
              {isCurated && headline && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  className="h-12 gap-2 px-6"
                  render={
                    <Link href={`/projects?tag=${encodeURIComponent(headline.name)}`} />
                  }
                >
                  <Trophy aria-hidden className="size-4" />
                  {event.name} {headline.name}
                </Button>
              )}
              {/* From the event's Extras — the featured event supplies its own
                  rubric, and the button is dropped when it has none. */}
              {criteria && (
                <Button
                  variant="ghost"
                  nativeButton={false}
                  className="h-12 gap-2 px-6"
                  render={
                    <Link
                      href={criteria.href}
                      {...(criteria.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    />
                  }
                >
                  <Scale aria-hidden className="size-4" />
                  How entries are judged
                  {criteria.external && <ExternalLink aria-hidden className="size-4" />}
                </Button>
              )}
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
