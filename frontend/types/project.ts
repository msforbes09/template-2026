// Response shapes for the Projects endpoints, which exist in all three API
// groups (User `/projects`, Administrator `/projects`, Common
// `/hackathon-2026-projects` · `/top-30-projects` · `/projects/{uuid}`).
//
// Every project carries two independent things:
//
// - a **working copy** — the editable fields below, visible to its owner and
//   to admins;
// - a **published snapshot** — a frozen copy taken when an admin publishes,
//   and the only thing the public site ever renders.
//
// …and two independent state fields: `status` (where the working copy sits in
// review) and `is_published` (whether a snapshot is live). Editing a live
// project does NOT take it down — it reads `status: "draft", is_published: 1`
// until an admin publishes the new version. See project-status.ts for the
// label each pair maps to.

// The review lane of the working copy. `for_publishing` is the admin lane
// (admin-created or admin-edited projects), the rest are the citizen lane.
import type { RatingBreakdown, Reviewer } from "@/types/review";

export type ProjectStatus =
  | "draft"
  | "for_assessment"
  | "for_resubmission"
  | "for_publishing"
  | "published";

// Private upload (POST common/files/private) — `url` is signed and expires in
// ~3h, so it's rendered from the freshest response rather than cached.
export type ProjectPhoto = { uuid: string; url: string | null } | null;

// Free-form bag the owner controls. The public detail page shows it because
// no account identity is ever exposed there — team and member names are what
// it's for (`{ team: "Team Bayanihan", members: ["Ana", "Ben"] }`).
export type ProjectMeta = Record<string, unknown> | null;

// The fields an owner edits — shared by the working copy and the frozen
// snapshot, which is why the snapshot type is just this.
type ProjectContent = {
  name: string;
  tagline: string | null;
  // Markdown (max 20,000 chars).
  description: string;
  photo: ProjectPhoto;
  // https, YouTube hosts only.
  video_url: string;
  project_url: string;
  repository_url: string | null;
  tech_stack: string[];
  // Active API-catalog identifiers (GET common/api-catalogs).
  egov_apis_used: string[];
  meta: ProjectMeta;
};

// GET user/projects/{uuid} (`Project`) — the working copy plus its review
// state. No internal ids anywhere in this API.
// Server-computed rating aggregates, on every project list card and show for
// all three audiences (the admin resources inherit them from the citizen one).
// `rating_avg` is 0 when nothing has been reviewed, so `rating_count` is the
// field that decides whether there is a rating to show at all.
//
// Optional on the type because the backend carrying them is not deployed yet
// (merged on egov-api-ws develop, absent from the live OpenAPI as of
// 2026-08-20) — reading them as possibly-undefined is what keeps the stars
// from rendering as "0" against an older API.
type ProjectRatings = {
  rating_avg?: number;
  rating_count?: number;
};

// Per-star counts, returned by the project SHOW endpoints only — list cards
// carry the average and count but not this. Always keyed "1" through "5", all
// zeros when unreviewed. Optional for the same not-yet-deployed reason as the
// aggregates above.
// Defined once in types/review.ts — the two review surfaces share it.
export type { RatingBreakdown } from "@/types/review";

// The event summary embedded on a project show. Carries the slug, which is
// how the public browses that event — always read it from here or from
// GET common/egov-events rather than hardcoding, because a slug is
// regenerated whenever its event is renamed.
export type ProjectEventRef = {
  id: number;
  slug: string;
  name: string;
};

type ProjectBreakdown = {
  rating_breakdown?: RatingBreakdown;
};

export type Project = ProjectContent & ProjectRatings & ProjectBreakdown & {
  uuid: string;
  // The programme this project was entered into, or null. Shows only — list
  // cards do not carry it.
  egov_event?: ProjectEventRef | null;
  // 1 while an administrator holds the claim, at which point the owner may
  // not edit or delete (400 project_under_assessment). A bare flag: the
  // citizen never learns WHICH admin.
  is_assessment_started?: 0 | 1;
  // Admin curation labels, returned as plain names; color/icon live only in
  // the catalogue (GET common/project-tags). See project-tags.ts.
  tags: string[];
  status: ProjectStatus;
  // Why an admin sent it back — only meaningful on `for_resubmission`.
  assessment_remarks: string | null;
  is_published: 0 | 1;
  // Whether the public catalogue may show it. Set automatically on the first
  // publish; the public site requires this AND is_published.
  is_public: 0 | 1;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// GET user/projects (`ProjectList`) — the lean card. Arrays, markdown and
// remarks are omitted; fetch the show endpoint for those.
export type ProjectListItem = ProjectRatings & {
  uuid: string;
  // Present on the citizen list so Edit/Delete can be disabled without
  // opening the project first.
  is_assessment_started?: 0 | 1;
  name: string;
  tagline: string | null;
  photo: ProjectPhoto;
  status: ProjectStatus;
  is_published: 0 | 1;
  is_public: 0 | 1;
  published_at: string | null;
  updated_at: string;
  tags: string[];
};

// The live version of a project, frozen at publish time (`ProjectSnapshot`).
// Carries no status, no tags (tags are live, not snapshotted) and no uuid.
export type ProjectSnapshot = ProjectContent;

// An administrator identified on a claim/publish (id is also the value the
// `assessment_started_by_id` list filter takes).
export type ProjectAdminRef = { id: number; name: string };

// The owning citizen. Null on an admin-created project.
export type ProjectOwnerRef = { uuid: string; display_name: string };

// GET administrator/projects/{uuid} (`AdminProject`) — the citizen shape plus
// the claim/publish trail and the live snapshot to diff against.
export type AdminProject = Project & {
  is_assessment_started: 0 | 1;
  assessment_started_at: string | null;
  assessment_started_by: ProjectAdminRef | null;
  published_by: ProjectAdminRef | null;
  user: ProjectOwnerRef | null;
  published_snapshot: ProjectSnapshot | null;
};

// GET administrator/projects (`AdminProjectList`).
export type AdminProjectListItem = ProjectListItem & {
  is_assessment_started: 0 | 1;
  assessment_started_by: ProjectAdminRef | null;
  user: ProjectOwnerRef | null;
};

// GET common/projects/{uuid} (`PublicProject`) — rendered ONLY from the live
// snapshot, so there's no status and no owner identity here at all.
export type PublicProject = ProjectContent & ProjectRatings & ProjectBreakdown & {
  uuid: string;
  egov_event?: ProjectEventRef | null;
  tags: string[];
  published_at: string;
};

// GET common/hackathon-2026-projects · common/top-30-projects
// (`PublicProjectList`) — the public card, also snapshot-only.
export type PublicProjectListItem = ProjectRatings & {
  uuid: string;
  name: string;
  tagline: string | null;
  photo: ProjectPhoto;
  tech_stack: string[];
  egov_apis_used: string[];
  tags: string[];
  published_at: string;
};

// GET common/project-tags (`ProjectTag`) — the curated catalogue that gives a
// tag name its color and icon. Fetched once and joined against every
// project's `tags[]`; see project-tags.ts.
export type ProjectTag = {
  name: string;
  // Hex color for the chip/badge.
  color: string;
  // Icon slug (lucide-style), e.g. "trophy", "medal", "smartphone".
  icon: string;
};

// GET common/project-tags returns the catalogue in named groups now, and the
// groups are data rather than a fixed enum: they change in backend config
// without an API version bump, so render them in the order returned and never
// switch on the group name.
export type ProjectTagGroup = {
  group: string;
  tags: ProjectTag[];
};

// NOTE: TOP_30_TAG / TOP_5_TAG used to live here. They are gone on purpose.
// Curation labels are per-event now (EgovEvent.custom_tags) and no longer a
// global constant anyone can import — which is what let the old tab row claim
// every event has a "TOP 30". Read them off the event.


// ── Reviews ───────────────────────────────────────────────────────────────
//
// Any authenticated citizen may review any publicly visible project, once —
// approval is NOT required, unlike authoring a project. A review is a
// singleton at user/projects/{uuid}/review: same URL, different verbs.
//
// `is_anonymous` is a public-display choice only. The account is always bound
// server-side and admins always see who wrote what.

// One level deep, and only two people can post: the review author and the
// project owner. There are no replies to replies.
// `is_developer` marks an approved developer account, and earns a badge next
// to the name wherever a reviewer is shown. Optional: the backend carrying it
// is not deployed yet, and an absent flag must read as "not flagged" rather
// than badging everyone.
// Identical to the shared Reviewer — a review's author looks the same
// whichever surface it is on. Aliased rather than redeclared.
export type ProjectReviewer = Reviewer;

export type ProjectReviewReply = {
  uuid: string;
  comment: string;
  // 1 when written by the project owner. Owner replies never carry a name —
  // the public site exposes no owner identity — so label them for the team.
  is_owner: 0 | 1;
  // Null for an owner reply, and for an anonymous reviewer's own replies.
  reviewer: ProjectReviewer | null;
  created_at: string;
};

// GET user/projects/{uuid}/review — the caller's own review. No reviewer
// field: it is theirs. 404 means they haven't written one yet, which is the
// "write a review" state rather than an error.
export type ProjectReview = {
  uuid: string;
  rating: number;
  comment: string | null;
  is_anonymous: 0 | 1;
  replies: ProjectReviewReply[];
  created_at: string;
  updated_at: string;
};

// GET common/projects/{uuid}/reviews — the public thread, newest first.
export type PublicProjectReview = Omit<ProjectReview, "replies"> & {
  // Null when the review is anonymous; render "Anonymous".
  reviewer: ProjectReviewer | null;
  replies: ProjectReviewReply[];
};

// GET administrator/projects/{uuid}/reviews — real identities everywhere, on
// any project rather than only public ones. `is_anonymous: 1` here means
// "hidden on the public site", not hidden from administrators.
export type AdminProjectReviewReply = {
  uuid: string;
  comment: string;
  is_owner: 0 | 1;
  user: { uuid: string | null; display_name: string | null };
  created_at: string;
};

export type AdminProjectReview = {
  uuid: string;
  rating: number;
  comment: string | null;
  is_anonymous: 0 | 1;
  user: { uuid: string | null; display_name: string | null };
  replies: AdminProjectReviewReply[];
  created_at: string;
  updated_at: string;
};

// Both review surfaces share one FormRequest on the backend, so the limits
// are defined once in types/review.ts and re-exported here for the call sites
// that already import them from this file.
export { REVIEW_COMMENT_MAX, REVIEW_REPLY_MAX } from "@/types/review";


// ── eGov Events ───────────────────────────────────────────────────────────
//
// An event is a programme projects are entered into (the hackathon, and
// whatever follows). It replaced the "default tag" mechanism, and several can
// run at once.
//
// The slug is generated from the name and REGENERATED whenever the name
// changes, so it is never hardcoded and never stored: read it from the event
// object at the point of use.

export type EgovEvent = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  photo: ProjectPhoto;
  starts_at: string | null;
  ends_at: string | null;
  // Free-form and public (venue, prizes, links). Render what is there; do not
  // assume keys.
  meta: Record<string, unknown> | null;
  // This event's OWN curation labels — "TOP 30", "Winner", "People's Choice".
  // Same {name,color,icon} shape as a catalogue tag, so the existing chip
  // component and the resolveTags join work on them unchanged.
  //
  // They replaced a fixed global `Curation` group that GET common/project-tags
  // no longer returns (2026-08-26 handoff). The public curation tabs are built
  // from this array, in the order the API returns it, so a future event
  // renders its own labels with no frontend change.
  //
  // The API always sends an array — `[]` when the event curates nothing — but
  // it is optional here because payloads from before that change have no such
  // key, and a page must not blow up on one. Read it through eventCustomTags.
  custom_tags?: ProjectTag[];
  // Two ORTHOGONAL flags, added 2026-08-23. Do not conflate them:
  //
  //   is_active    — ongoing, still accepting projects. Gates the citizen's
  //                  create-time picker and NOTHING else; the API 422s an
  //                  inactive egov_event_id on create.
  //   is_published — publicly visible. Gates the event's project showcase:
  //                  a hidden event 404s its project list but KEEPS its
  //                  directory entry (name, slug, dates stay listed).
  //
  // A closed event is still published, and its showcase stays browsable
  // forever — that is what makes "past events" possible.
  //
  // Both are optional because the public directory did not carry them before
  // that change, and the frontend has to render correctly on both sides of
  // the switch. Read them through isEventActive/isEventPublished rather than
  // comparing directly, so a payload without them degrades the right way.
  is_active?: 0 | 1;
  is_published?: 0 | 1;
};

// The event's curation labels, always a list. Absent means a payload from
// before custom_tags shipped, which is "this event curates nothing" — the same
// thing an explicit [] means, so both collapse to one answer here rather than
// at every call site.
export function eventCustomTags(event: EgovEvent): ProjectTag[] {
  return Array.isArray(event.custom_tags) ? event.custom_tags : [];
}

// Missing means the older payload, where the directory returned active events
// only — so everything it gave you was active.
export function isEventActive(event: EgovEvent): boolean {
  return event.is_active !== 0;
}

// Missing means the older payload, which had no concept of hiding, and the
// backend defaults the column to true regardless.
export function isEventPublished(event: EgovEvent): boolean {
  return event.is_published !== 0;
}

// The admin view adds the timestamps; both flags come from EgovEvent, where
// is_active is always present on admin payloads.
export type AdminEgovEvent = EgovEvent & {
  is_active: 0 | 1;
  // Only on the admin LIST (withCount there); absent from single-event
  // responses, hence optional.
  projects_count?: number;
  created_at: string;
  updated_at: string;
};

// POST/PUT administrator/egov-events. `slug` is never sent — it is generated,
// and a supplied value is ignored.
export type EgovEventInput = {
  name: string;
  description: string | null;
  is_active: boolean;
  // Whether the event's project showcase is reachable publicly. Independent
  // of is_active — closing an event does not hide its entries.
  is_published: boolean;
  starts_at: string | null;
  ends_at: string | null;
  photo_uuid: string | null;
  meta: Record<string, unknown> | null;
};
