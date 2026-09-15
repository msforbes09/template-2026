import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import type { Paginated } from "@/types/pagination";
import type { PublicProjectReview } from "@/types/project";
import { safeErrorMessage } from "@/lib/safe-error-message";

// The public review thread. Unauthenticated, identical for every visitor, so
// it is cached the same way the rest of the public project data is — tagged
// per project so a write to one project's thread doesn't dump another's.
//
// Never rejects. This is reachable from a prerendered page, and a rejection
// thrown out of a `"use cache"` scope is not caught by the caller during
// prerendering — it fails the build instead. See get-public-projects.ts.
export const REVIEWS_PER_PAGE = 10;

// `disabled` is its own outcome rather than an error, exactly as the catalog
// thread treats it. Project reviews sit behind the `project_reviews` feature
// flag, and while it is off the backend's `reviews.enabled:projects`
// middleware 404s every endpoint on the surface,
// the public thread included. That means "the feature is off, hide the
// section", so a 404 must not render as a failed load.
//
// A 404 also covers an unknown or unpublished project, but a caller only asks
// for this thread from a project page that already resolved, so treating it as
// "off" is the honest reading and degrades identically either way.
export type ProjectReviewsResult =
  | { ok: true; page: Paginated<PublicProjectReview> }
  | { ok: false; disabled: true }
  | { ok: false; disabled: false; message: string };

export async function getPublicProjectReviews(
  uuid: string,
  page = "1",
): Promise<ProjectReviewsResult> {
  "use cache";
  cacheTag("project-reviews", `project-reviews:${uuid}`);
  // Shorter than the project itself: a review appearing is the kind of change
  // a visitor notices, and the write actions revalidate the tag anyway.
  cacheLife("minutes");

  try {
    const result = await apiFetch<Paginated<PublicProjectReview>>(
      `/projects/${uuid}/reviews?per_page=${REVIEWS_PER_PAGE}&page=${page}`,
      {},
      undefined,
      "/common",
    );
    return { ok: true, page: result };
  } catch (err) {
    if (isApiError(err) && err.status === 404) return { ok: false, disabled: true };
    return {
      ok: false,
      disabled: false,
      message: safeErrorMessage(err, "Something went wrong loading the reviews."),
    };
  }
}
