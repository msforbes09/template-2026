import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import { getClientSession } from "@/lib/auth/dal";
import { getClientProfile } from "@/modules/site/lib/get-client-profile";
import { canReviewCatalogs, isDeveloper, isSuspended } from "@/modules/client-auth/lib/account";
import { RatingSummary } from "@/modules/reviews/components/star-rating";
import { RatingBreakdownBars } from "@/modules/reviews/components/rating-breakdown";
import { CatalogReviewForm } from "@/modules/api-catalog/components/catalog-review-form";
import { CatalogReviewItem } from "@/modules/api-catalog/components/catalog-review-item";
import { getMyCatalogReview } from "@/modules/api-catalog/actions/catalog-review-actions";
import {
  CATALOG_REVIEWS_PER_PAGE,
  getPublicCatalogReviews,
} from "@/modules/api-catalog/lib/get-catalog-reviews";
import { getPublicApiCatalog } from "@/modules/site/lib/get-public-api-catalog";
import type { Rateable } from "@/modules/reviews/lib/rating";
import type { RatingBreakdown } from "@/types/review";

// The public review thread for one API catalog, plus the signed-in
// developer's own review.
//
// The two halves are fetched differently on purpose: the thread is identical
// for every visitor and is cached, while "your review" is per-session and
// never is.
//
// Reviewing here needs an APPROVED DEVELOPER account — a stricter bar than
// project reviews, which any authenticated citizen may write.
export async function CatalogReviews({
  identifier,
  // The aggregates, when the caller already has them. Omit on a page whose
  // catalog payload isn't at hand and they are read here instead — from the
  // cached PUBLIC catalog, which is the same source the summary would show
  // anyway. Passing {} would silently render "No ratings yet" over a
  // well-reviewed API, so there is no empty default.
  catalog,
  // Per-star counts, from the show endpoint only. Absent on a list card.
  breakdown,
  page = "1",
}: {
  identifier: string;
  catalog?: Rateable;
  breakdown?: RatingBreakdown;
  page?: string;
}) {
  // The FRONTEND kill switch, checked before anything is fetched.
  //
  // `await connection()` is load-bearing, not ceremony — the same trap
  // AssistantMount documents. Everything below reads cookies, which is what
  // makes this subtree a dynamic hole; an early return ABOVE that read has no
  // such protection, so with the flag off at build time Next would prerender
  // the `null` straight into the static shell and the section would stay gone
  // even after the flag was turned back on. connection() stops the prerender
  // here so the env is read per request.
  //
  // Separate from the backend's own refusal handled below: that one 404s the
  // endpoints and is discovered by asking. This one avoids asking at all.
  //
  // The flag map replaced a frontend env var (2026-09-02 handoff): the switch
  // is now stored backend-side and flipped by a developer administrator at
  // runtime, so the two halves can no longer drift apart the way two envs set
  // in two places could.
  await connection();
  if (!(await isFeatureEnabled("api_catalog_reviews"))) return null;

  const [reviews, session, fallbackCatalog] = await Promise.all([
    getPublicCatalogReviews(identifier, page),
    getClientSession(),
    catalog ? null : getPublicApiCatalog(identifier),
  ]);

  const subject: Rateable = catalog ?? fallbackCatalog ?? {};
  const bars = breakdown ?? fallbackCatalog?.rating_breakdown;

  // The BACKEND's own refusal (driven by the same flag) 404s every
  // endpoint on this surface, the public thread included. That is "the feature
  // is off", so the whole section goes rather than rendering an error or an
  // empty thread with a write form that would fail on submit. Still handled
  // even with the UI flag on, since the two are set independently.
  if (!reviews.ok && reviews.disabled) return null;

  const profile = session ? await getClientProfile() : null;
  const mayReview = !!profile && canReviewCatalogs(profile);

  // Only asked for when there is somebody to ask about, and only when they
  // could actually write — a non-developer would get 403 for the whole
  // surface, so asking would be a guaranteed failed request per render.
  const myReview = mayReview ? await getMyCatalogReview(identifier) : null;
  const mine = myReview?.ok ? myReview.data : null;

  return (
    <section aria-labelledby="catalog-reviews-heading" className="scroll-mt-24" id="reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="catalog-reviews-heading" className="text-2xl font-semibold tracking-tight">
          Developer reviews
        </h2>
        <RatingSummary subject={subject} emptyLabel="No ratings yet" />
      </div>

      <div className="mt-6">
        <RatingBreakdownBars subject={subject} breakdown={bars} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {mayReview ? (
          <>
            <h3 className="text-sm font-semibold tracking-tight">
              {mine ? "Your review" : "Rate this API"}
            </h3>
            <div className="mt-4">
              <CatalogReviewForm identifier={identifier} review={mine} />
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Rate this API</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {/* Each case names the actual next step rather than one
                    generic refusal — a basic account can apply, a suspended
                    one cannot, and a signed-out visitor just needs to sign
                    in. */}
                {!session
                  ? "Sign in with a developer account to rate and review this API."
                  : profile && isSuspended(profile)
                    ? "Your account is suspended, so you can't post reviews."
                    : profile && !isDeveloper(profile)
                      ? "Only approved developer accounts can review APIs. Apply for developer access to join in."
                      : "Only approved developer accounts can review APIs."}
              </p>
            </div>
            {!session ? (
              <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
                Sign in
              </Button>
            ) : (
              profile &&
              !isDeveloper(profile) &&
              !isSuspended(profile) && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/dashboard/developers" />}
                >
                  Apply for developer access
                </Button>
              )
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        {!reviews.ok ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load the reviews"
            description={reviews.message}
          />
        ) : reviews.page.data.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews yet"
            description="Be the first developer to say what building against this API was like."
          />
        ) : (
          <>
            <ul>
              {reviews.page.data.map((review) => (
                <li key={review.uuid}>
                  <CatalogReviewItem
                    review={review}
                    identifier={identifier}
                    myReviewUuid={mine?.uuid}
                    canReply={mayReview}
                  />
                </li>
              ))}
            </ul>
            {(reviews.page.meta?.last_page ?? 1) > 1 && (
              <div className="mt-6">
                <PaginationBar
                  meta={
                    reviews.page.meta ?? {
                      current_page: Number(page) || 1,
                      last_page: 1,
                      per_page: CATALOG_REVIEWS_PER_PAGE,
                      total: reviews.page.data.length,
                      from: 1,
                      to: reviews.page.data.length,
                    }
                  }
                  scroll={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// Mirrors the section: heading row, the write-a-review card, and a few review
// blocks with their meta line and body.
export function CatalogReviewsSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 animate-pulse rounded bg-muted" />
        <div className="h-5 w-28 animate-pulse rounded bg-muted/60" />
      </div>
      <div className="h-32 w-full animate-pulse rounded-xl bg-muted/50" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2 border-t border-border pt-6 first:border-t-0">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
