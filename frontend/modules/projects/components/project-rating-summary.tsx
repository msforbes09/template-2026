import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import { RatingSummary } from "@/modules/reviews/components/star-rating";
import type { Rateable } from "@/modules/reviews/lib/rating";

// A project's star rating, wherever it appears OUTSIDE the review thread —
// the public hero and card, and the owner's dashboard detail and card.
//
// It exists because the rating is an aggregate OF the reviews. With
// `project_reviews` off the thread is gone, so a summary reading
// "4.5 · 12 ratings" points at something nobody can open, cannot be added to,
// and cannot be checked. The number stays in the API payload and comes back
// untouched when the switch is turned on again.
//
// A Server Component, and every call site is one too, so the flag is read
// server-side and no rating reaches the client bundle while it is off.
//
// PRERENDERING, worth understanding before adding a call site: unlike
// ProjectReviews this deliberately does NOT call connection(). These render in
// the static shell of /projects and /projects/[uuid] — the hero sits in the
// page body, outside every Suspense — so forcing them dynamic would throw away
// the prerendered shell those pages are built around.
//
// Reading the flag map here is safe inside that shell precisely because
// getFeatureFlags is itself a cached read rather than a dynamic API. The trade
// is that a flipped flag reaches these surfaces when the cached page next
// revalidates rather than instantly, while the review section itself updates
// immediately. That is the right way round: the section is the thing that
// would otherwise accept writes.
//
// It is also strictly better than the env var it replaced, which was frozen at
// BUILD time — a flag flip could not reach a prerendered page at all without a
// rebuild.
export async function ProjectRatingSummary({
  subject,
  size,
  className,
  emptyLabel,
}: {
  subject: Rateable;
  size?: "default" | "sm";
  className?: string;
  emptyLabel?: string;
}) {
  // `emptyLabel` is ignored on purpose when the surface is off: the caller
  // asked for "say something when there are no ratings", not "say something
  // when ratings do not exist here at all".
  if (!(await isFeatureEnabled("project_reviews"))) return null;

  return (
    <RatingSummary
      subject={subject}
      size={size}
      className={className}
      emptyLabel={emptyLabel}
    />
  );
}
