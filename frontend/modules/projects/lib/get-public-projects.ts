import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { safeErrorMessage } from "@/lib/safe-error-message";
import { isMissingProjectError } from "@/modules/projects/lib/project-errors";
import type { Paginated } from "@/types/pagination";
import { isEventActive, isEventPublished } from "@/types/project";
import type {
  EgovEvent,
  ProjectTag,
  ProjectTagGroup,
  PublicProject,
  PublicProjectListItem,
} from "@/types/project";

// Public, unauthenticated reads against the Common API — no session token, so
// `undefined` audience with a "/common" basePathOverride (4th arg), the same
// shape as getPublicApiCatalog. Public/SEO reads are the one sanctioned place
// a server read skips requireSession.
//
// Cached because every response here is identical for every visitor: the
// public site renders only the frozen snapshot, never anything per-session.
//
// Nothing in this file rejects. These reads are reachable from prerendered
// pages, and a rejection thrown out of a `"use cache"` scope is NOT caught by
// a try/catch at the call site during prerendering — it fails the build (see
// the 2026-08-20 build fix).

export const PUBLIC_PROJECTS_PER_PAGE = 12;

// The API's only sort besides its default. `rating` ranks by a server-side
// Bayesian-weighted score, so a lone 5-star review does not outrank a
// well-reviewed project and unreviewed projects sort last.
export const PROJECT_SORTS = ["rating"] as const;
export type PublicProjectSort = (typeof PROJECT_SORTS)[number];

export function isProjectSort(value: string): value is PublicProjectSort {
  return (PROJECT_SORTS as readonly string[]).includes(value);
}

export type PublicProjectFilters = {
  search?: string;
  // Single value or comma-separated; the API requires ALL of them to match.
  egov_api?: string;
  tech?: string;
  // Curated tags ("TOP 30", "TOP 5") are just a tag filter now — this is how
  // the featured lists are built.
  tag?: string;
  // Omitted for the default newest-published order. Anything the API doesn't
  // know is a 422, so a value off the URL is validated before it is sent.
  sort?: string;
  page?: string;
};

function buildQuery(filters: PublicProjectFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.egov_api) params.set("egov_api", filters.egov_api);
  if (filters.tech) params.set("tech", filters.tech);
  if (filters.tag) params.set("tag", filters.tag);
  // A hand-edited ?sort= must not turn the page into a 422.
  if (filters.sort && isProjectSort(filters.sort)) params.set("sort", filters.sort);
  params.set("page", filters.page || "1");
  params.set("per_page", String(PUBLIC_PROJECTS_PER_PAGE));
  return params.toString();
}

// ── Events ────────────────────────────────────────────────────────────────

// Which slice of the directory a caller wants. Both flags are orthogonal:
// `active` is "still accepting projects", `published` is "its showcase is
// reachable". Omitting one means "don't filter on it".
export type EgovEventFilters = {
  isActive?: boolean;
  isPublished?: boolean;
};

// The event directory, active first then newest. This is the ONLY sanctioned
// source of a slug: slugs are regenerated whenever an event is renamed, so
// hardcoding one (or persisting it) produces a 404 the day somebody edits a
// title.
//
// As of 2026-08-23 this lists EVERY live event, past ones included — it used
// to be active-only. That is why callers now say which slice they want
// instead of taking the whole list: a create-time picker that offers a closed
// event hands the citizen a guaranteed 422. The filters are sent as query
// params, which the pre-change backend simply ignores, so this reads
// correctly on both sides of the switch.
export async function getEgovEvents(filters: EgovEventFilters = {}): Promise<EgovEvent[]> {
  "use cache";
  cacheTag("egov-events");
  // NOT cacheLife("hours"). Each event carries `photo.url`, a SIGNED URL that
  // expires in about three hours — and the "hours" profile expires after 24,
  // so a cached entry could be served for the best part of a day carrying an
  // image URL that died before breakfast. The cache must not outlive the
  // shortest-lived thing inside it, so expire is pinned to an hour.
  //
  // Still well above the five-minute "short-lived" threshold, so this stays
  // prerenderable rather than becoming a dynamic hole. An admin edit takes
  // effect immediately regardless, via the tag above.
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const params = new URLSearchParams();
  if (filters.isActive !== undefined) params.set("is_active", filters.isActive ? "1" : "0");
  if (filters.isPublished !== undefined) params.set("is_published", filters.isPublished ? "1" : "0");
  const query = params.toString();

  try {
    const { data } = await apiFetch<{ data: EgovEvent[] }>(
      query ? `/egov-events?${query}` : "/egov-events",
      {},
      undefined,
      "/common",
    );
    // Belt and braces: the filters are honoured server-side after the switch
    // and ignored before it, so a pre-switch response is narrowed here rather
    // than trusted. Without this the citizen picker would offer closed events
    // for the whole window between this deploying and the backend deploying.
    return data.filter(
      (event) =>
        (filters.isActive === undefined || isEventActive(event) === filters.isActive) &&
        (filters.isPublished === undefined || isEventPublished(event) === filters.isPublished),
    );
  } catch {
    // An empty list degrades to "no events yet" on the showcase rather than
    // taking a prerendered page down.
    return [];
  }
}

// Resolves the slug a visitor asked for against the live list, falling back to
// the newest event that actually HAS published projects. Returning the event
// itself (not just a slug) means callers can name it without a second lookup.
//
// The fallback is "newest with entries" rather than plain "newest" because
// several events run at once and a freshly created one is empty by definition.
// Defaulting to it blanked the showcase: the landing band renders nothing
// without projects, and /projects opened on "No projects published yet" while
// the previous event's entries sat one switcher-click away. Observed live the
// day a second event was added.
// GET common/egov-events/{slug} — one event's details, for the showcase
// header. Public, and 404s for an unknown or UNPUBLISHED slug (a hidden
// event's project list 404s too, so the pair stays consistent). Deliberately
// does not require is_active: a closed programme's page stays reachable.
//
// Returns null rather than throwing, for the same reason as every other read
// in this file — these are cached, and a rejection escaping a cache scope
// fails the build instead of degrading the page.
export async function getEgovEvent(slug: string): Promise<EgovEvent | null> {
  "use cache";
  cacheTag("egov-events");
  // Carries `photo.url`, a signed URL — same one-hour ceiling as its
  // neighbours, and for the same reason.
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  try {
    const { data } = await apiFetch<{ data: EgovEvent }>(
      `/egov-events/${encodeURIComponent(slug)}`,
      {},
      undefined,
      "/common",
    );
    return data;
  } catch {
    return null;
  }
}

export async function resolveEgovEvent(slug?: string): Promise<EgovEvent | null> {
  // Published only: a hidden event 404s its project list, so featuring one
  // would resolve to a showcase that cannot render. Closed-but-published
  // events stay eligible on purpose — a finished programme's entries are
  // still worth showing, and the directory orders active ones first, so a
  // running event still wins when there is one.
  const events = await getEgovEvents({ isPublished: true });
  if (events.length === 0) return null;

  if (slug) {
    const match = events.find((event) => event.slug === slug);
    if (match) return match;

    // Not in the directory we hold. That is not the same as "does not exist":
    // the list is one unpaginated read, so a portal with many events could
    // simply not have it here. Ask for it by name — the show endpoint is
    // authoritative and 404s for an unknown OR unpublished slug, so a null
    // answer is a real answer.
    const named = await getEgovEvent(slug);
    if (named && isEventPublished(named)) return named;

    // Still nothing: an unknown or renamed slug falls back rather than
    // 404ing, because the showcase is more useful showing something.
  }

  // Bounded: a portal with many events shouldn't cost a request per event on
  // every page. Each of these is cached, so the walk is cheap after the first.
  for (const event of events.slice(0, 5)) {
    const result = await getEventProjects(event.slug, { page: "1" });
    if (result.ok && result.page.data.length > 0) return event;
  }

  // Nothing published anywhere yet — the newest is still the right thing to
  // name, so the page can say which event it is waiting on.
  return events[0];
}

// ── Projects, scoped to an event ──────────────────────────────────────────

export type PublicProjectsResult =
  | { ok: true; page: Paginated<PublicProjectListItem> }
  | { ok: false; message: string };

// GET common/egov-events/{slug}/projects — published, publicly visible
// projects for one event, rendered from the frozen snapshot.
//
// A 404 means unknown, HIDDEN (is_published=0), or deleted. It no longer
// means "inactive": since 2026-08-23 a closed event's showcase stays
// browsable, which is what makes past events viewable at all. Treated as
// "nothing to show" rather than an error either way.
export async function getEventProjects(
  slug: string,
  filters: PublicProjectFilters = {},
): Promise<PublicProjectsResult> {
  "use cache";
  cacheTag("projects", `egov-events:${slug}`);
  // Pinned to an hour rather than the "hours" profile for the same reason as
  // getEgovEvents above: every project carries `photo.url`, a signed URL that
  // expires in about three hours, and "hours" keeps an entry for 24. A cover
  // image that 403s on a page that still says it has one is worse than a
  // slightly cooler cache.
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  try {
    const page = await apiFetch<Paginated<PublicProjectListItem>>(
      `/egov-events/${encodeURIComponent(slug)}/projects?${buildQuery(filters)}`,
      {},
      undefined,
      "/common",
    );
    return { ok: true, page };
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      // Deliberately not "this event isn't running" any more — a closed event
      // still shows its entries, so a 404 here means the showcase is genuinely
      // unavailable, not merely finished.
      return { ok: false, message: "This event's projects aren't available." };
    }
    // A network failure is a plain TypeError carrying nothing worth showing a
    // visitor, so only a real API error contributes its message.
    return {
      ok: false,
      message: safeErrorMessage(err, "Something went wrong loading the showcase."),
    };
  }
}

// ── One project ───────────────────────────────────────────────────────────

// Returns null when the project can't be resolved — an unknown uuid, or one
// that exists but isn't live and public. Note the API reports that as 400
// `data_processing_failed` rather than the documented 404; see
// isMissingProjectError.
export async function getPublicProject(uuid: string): Promise<PublicProject | null> {
  "use cache";
  cacheTag("projects", `projects:${uuid}`);
  // Pinned to an hour rather than the "hours" profile for the same reason as
  // getEgovEvents above: every project carries `photo.url`, a signed URL that
  // expires in about three hours, and "hours" keeps an entry for 24. A cover
  // image that 403s on a page that still says it has one is worse than a
  // slightly cooler cache.
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  try {
    const { data } = await apiFetch<{ data: PublicProject }>(
      `/projects/${uuid}`,
      {},
      undefined,
      "/common",
    );
    return data;
  } catch (err) {
    if (isMissingProjectError(err)) return null;
    throw err;
  }
}

// ── Tag catalogue ─────────────────────────────────────────────────────────

// The catalogue arrives in named groups now. Groups are DATA, not an enum:
// they change in backend config without an API version bump, so they are
// rendered in the order returned and never switched on by name.
export async function getProjectTagGroups(): Promise<ProjectTagGroup[]> {
  "use cache";
  cacheTag("project-tags");
  cacheLife("hours");

  try {
    const { data } = await apiFetch<{ data: ProjectTagGroup[] }>(
      "/project-tags",
      {},
      undefined,
      "/common",
    );
    return data;
  } catch {
    // Every chip then renders neutral, which beats failing a page over
    // decoration.
    return [];
  }
}

// Flattened, for the name -> colour/icon join every project card does. The
// grouping only matters where a human picks from the catalogue.
export async function getProjectTags(): Promise<ProjectTag[]> {
  const groups = await getProjectTagGroups();
  return groups.flatMap((group) => group.tags);
}

// ── Build-time helpers ────────────────────────────────────────────────────

// Every published project across every event with a reachable showcase,
// walked page by page. Backs generateStaticParams and the sitemap, both of
// which run at build time, so a failed read degrades to "no prerendered
// detail pages" rather than failing the build.
//
// Past events are included now — their entries stay public, so they still
// deserve prerendered pages and sitemap entries. Hidden ones are excluded
// rather than walked and 404ed.
export async function getPublicProjectUuids(): Promise<string[]> {
  "use cache";
  cacheTag("projects", "egov-events");
  cacheLife("hours");

  const events = await getEgovEvents({ isPublished: true });
  const uuids = new Set<string>();

  for (const event of events) {
    let page = 1;
    let lastPage = 1;
    do {
      const result = await getEventProjects(event.slug, { page: String(page) });
      if (!result.ok) break;
      result.page.data.forEach((project) => uuids.add(project.uuid));
      lastPage = result.page.meta?.last_page ?? 1;
      page += 1;
      // Hard stop: a paginator that never reports its last page shouldn't
      // turn a build into an unbounded crawl.
    } while (page <= lastPage && page <= 20);
  }

  return [...uuids];
}
