// Reviews, shared between the two things that can be reviewed.
//
// The backend merged project reviews and API-catalog reviews into one system
// on 2026-08-23; these are the parts genuinely common to both. What differs
// is who may reply and how a non-author reply is attributed, so that stays
// with each surface rather than being forced in here.

// `is_developer` marks an approved developer account and earns a badge next
// to the name. Optional: an absent flag must read as "not flagged" rather
// than badging everyone.
export type Reviewer = {
  display_name: string;
  is_developer?: 0 | 1;
};

// Validation limits, mirrored from the backend's FormRequests so a bad review
// fails in the form instead of round-tripping to a 422. Identical on both
// surfaces — they share the FormRequest.
export const REVIEW_COMMENT_MAX = 5000;
export const REVIEW_REPLY_MAX = 2000;

// The star histogram, keyed "1"–"5". Every key is always present — the
// backend defaults the whole object to zeros rather than omitting keys — so
// this is a full Record, not a Partial. The field itself is optional on the
// resource, which is what callers guard on.
export type RatingBreakdown = Record<"1" | "2" | "3" | "4" | "5", number>;

// ── API-catalog reviews ───────────────────────────────────────────────────
//
// One review per APPROVED DEVELOPER per catalog — note the difference from
// project reviews, which any authenticated citizen may write. A singleton at
// user/api-catalogs/{identifier}/review: same URL, different verbs.
//
// Replies are one level deep and only two parties can post: the review's own
// author, and administrators. There is deliberately no "owner" party the way
// projects have one — a catalog has no owning citizen.

export type ApiCatalogReviewReply = {
  uuid: string;
  comment: string;
  // 1 for the OFFICIAL response from an administrator. Admin replies are
  // never named on public surfaces — `reviewer` is always null for them —
  // so they render as the eGov team rather than as a person.
  is_admin: 0 | 1;
  // Null for an admin reply, and for an anonymous reviewer's own replies.
  reviewer: Reviewer | null;
  created_at: string;
};

// GET user/api-catalogs/{identifier}/review — the caller's own. No reviewer
// field: it is theirs. A 404 means they haven't written one, which is the
// "write a review" state rather than an error.
export type ApiCatalogReview = {
  uuid: string;
  rating: number;
  comment: string | null;
  is_anonymous: 0 | 1;
  replies: ApiCatalogReviewReply[];
  created_at: string;
  updated_at: string;
};

// GET common/api-catalogs/{identifier}/reviews — the public thread, newest
// first, paginated.
export type PublicApiCatalogReview = ApiCatalogReview & {
  // Null when the review is anonymous.
  reviewer: Reviewer | null;
};

// GET administrator/api-catalogs/{id}/reviews — real identities throughout.
// `is_anonymous: 1` here means "hidden on the public site", not hidden from
// administrators.
export type AdminApiCatalogReviewReply = {
  uuid: string;
  comment: string;
  is_admin: 0 | 1;
  // Null on an admin reply; the citizen author otherwise.
  user: { uuid: string | null; display_name: string | null } | null;
  // Present only on an admin reply — who in the eGov team answered.
  admin: { id: number; name: string } | null;
  created_at: string;
};

export type AdminApiCatalogReview = {
  uuid: string;
  rating: number;
  comment: string | null;
  is_anonymous: 0 | 1;
  user: { uuid: string | null; display_name: string | null };
  replies: AdminApiCatalogReviewReply[];
  created_at: string;
  updated_at: string;
};

// Both review surfaces have an independent env kill switch, and when one is
// off EVERY endpoint on it 404s — the public thread included. That is "the
// feature is off, hide the section", never an error state.
export const REVIEWS_DISABLED = "reviews_disabled" as const;
