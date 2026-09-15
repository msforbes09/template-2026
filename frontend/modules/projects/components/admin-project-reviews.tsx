import {
  AlertTriangle,
  ChevronRight,
  CornerDownRight,
  EyeOff,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { repliesSummary } from "@/modules/projects/lib/replies-summary";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { formatDate } from "@/lib/format-date";
import { requireAdminSession } from "@/lib/auth/dal";
import { RatingSummary, ReviewStars } from "@/modules/reviews/components/star-rating";
import { wasEdited, type Rateable } from "@/modules/reviews/lib/rating";
import type { Paginated } from "@/types/pagination";
import type { AdminProjectReview } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

// The admin view of a project's reviews: real identities everywhere, on any
// project rather than only public ones. `is_anonymous: 1` means "hidden on the
// public site", not hidden from administrators, so the name is shown WITH a
// badge saying the public cannot see it.
//
// There is no moderation endpoint yet (deferred), so this is read-only.
//
// Paginated like the public thread. It used to ask for `per_page=50` and
// render whatever came back — so on a project with more than fifty reviews an
// administrator silently saw a truncated thread, with nothing on the page
// saying so.
export const ADMIN_REVIEWS_PER_PAGE = 10;

export async function AdminProjectReviews({
  projectUuid,
  project,
  page = "1",
}: {
  projectUuid: string;
  project: Rateable;
  page?: string;
}) {
  await requireAdminSession();

  // Caught rather than thrown: an uncaught throw inside a Suspense-wrapped
  // Server Component doesn't reliably reach error.tsx in this app.
  let reviews: AdminProjectReview[] = [];
  let meta: Paginated<AdminProjectReview>["meta"] | undefined;
  let loadError: string | null = null;
  // The BACKEND's `reviews.enabled:projects` middleware gates the ADMIN route
  // as well as the public one, so a 404 here means the feature is switched
  // off, not that the read failed. Told apart from a real error because
  // "Couldn't load the reviews" sends an administrator hunting for a fault
  // that does not exist.
  //
  // The `project_reviews` flag is deliberately NOT applied to
  // this surface: it hides the citizen-facing thread, while an administrator
  // keeps reading what was written while the feature was on.
  let disabled = false;
  try {
    const response = await apiFetch<Paginated<AdminProjectReview>>(
      `/projects/${projectUuid}/reviews?per_page=${ADMIN_REVIEWS_PER_PAGE}&page=${page}`,
      { next: { tags: [`project-reviews:${projectUuid}`] } },
      "admin",
    );
    reviews = response.data;
    meta = response.meta;
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      disabled = true;
    } else {
      loadError = safeErrorMessage(err, "Something went wrong loading the reviews.");
    }
  }

  return (
    <section aria-labelledby="admin-reviews" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-reviews" className="text-lg font-semibold tracking-tight">
          Reviews
        </h2>
        <RatingSummary subject={project} emptyLabel="No ratings yet" />
      </div>

      {disabled ? (
        <EmptyState
          icon={EyeOff}
          title="Project reviews are switched off"
          description="The review surface is disabled for this environment, so there is nothing to moderate. Anything written while it was on is kept and reappears when it is switched back on."
        />
      ) : loadError ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load the reviews" description={loadError} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Reviews appear once the project is public and somebody rates it."
        />
      ) : (
        <ul className="rounded-xl border border-border bg-card px-5">
          {reviews.map((review) => (
            <li key={review.uuid} className="border-t border-border py-5 first:border-t-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <UserRound aria-hidden className="size-3.5 text-muted-foreground" />
                  {review.user.display_name ?? "Unknown account"}
                </span>
                {review.is_anonymous === 1 && (
                  <Badge variant="secondary" className="gap-1">
                    <EyeOff aria-hidden className="size-3" />
                    Anonymous publicly
                  </Badge>
                )}
                <ReviewStars rating={review.rating} />
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                  {wasEdited(review.created_at, review.updated_at) && (
                    <span className="ml-1.5 italic">edited</span>
                  )}
                </span>
              </div>
              {review.comment && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {review.comment}
                </p>
              )}
              {review.replies.length > 0 && (
                // Folded like the public thread — an assessor scanning a
                // project's reviews wants the ratings and comments first, not
                // every reply expanded underneath them.
                <details className="group mt-2">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      aria-hidden
                      className="size-3.5 transition-transform group-open:rotate-90"
                    />
                    {repliesSummary(review.replies)}
                  </summary>
                <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
                  {review.replies.map((reply) => (
                    <li key={reply.uuid}>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <CornerDownRight aria-hidden className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {reply.user.display_name ?? "Unknown account"}
                        </span>
                        {reply.is_owner === 1 && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            Project owner
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {reply.comment}
                      </p>
                    </li>
                  ))}
                </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {(meta?.last_page ?? 1) > 1 && meta && <PaginationBar meta={meta} scroll={false} />}
    </section>
  );
}
