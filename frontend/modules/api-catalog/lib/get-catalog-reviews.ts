import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/auth/dal";
import type { Paginated } from "@/types/pagination";
import type { AdminApiCatalogReview, PublicApiCatalogReview } from "@/types/review";
import { safeErrorMessage } from "@/lib/safe-error-message";

export const CATALOG_REVIEWS_PER_PAGE = 10;

// The public review thread for one API catalog. Unauthenticated and identical
// for every visitor, so it is cached like the rest of the public catalog
// data, tagged per catalog so a write to one thread doesn't dump another's.
//
// Never rejects: this is reachable from a prerendered page, and a rejection
// thrown out of a `"use cache"` scope is not caught by the caller during
// prerendering — it fails the build. See get-public-projects.ts.

// `disabled` is its own outcome rather than an error. Catalog reviews have an
// `api_catalog_reviews` feature flag, and when it is off EVERY
// endpoint on the surface 404s, the public thread included. The handoff is
// explicit that this means "the feature is off, hide the section", so a 404
// must not render as a failed load.
//
// A 404 also covers an unknown or inactive catalog, but a caller only asks
// for this thread from a catalog page that already resolved, so treating it
// as "off" is the honest reading and degrades identically either way.
export type CatalogReviewsResult =
  | { ok: true; page: Paginated<PublicApiCatalogReview> }
  | { ok: false; disabled: true }
  | { ok: false; disabled: false; message: string };

export async function getPublicCatalogReviews(
  identifier: string,
  page = "1",
): Promise<CatalogReviewsResult> {
  "use cache";
  cacheTag("catalog-reviews", `catalog-reviews:${identifier}`);
  // Shorter than the catalog itself: a review appearing is the kind of change
  // a visitor notices, and the write actions revalidate the tag anyway.
  cacheLife("minutes");

  try {
    const result = await apiFetch<Paginated<PublicApiCatalogReview>>(
      `/api-catalogs/${encodeURIComponent(identifier)}/reviews?per_page=${CATALOG_REVIEWS_PER_PAGE}&page=${page}`,
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

// The admin thread: real identities throughout, and each admin reply names
// the administrator who wrote it. Gated on api-catalogs-view, the same
// permission the admin catalog screens already check.
export type AdminCatalogReviewsResult =
  | { ok: true; page: Paginated<AdminApiCatalogReview> }
  | { ok: false; disabled: true }
  | { ok: false; disabled: false; message: string };

export async function getAdminCatalogReviews(
  id: number | string,
  page = "1",
): Promise<AdminCatalogReviewsResult> {
  await requireAdminSession();

  try {
    const result = await apiFetch<Paginated<AdminApiCatalogReview>>(
      `/api-catalogs/${encodeURIComponent(String(id))}/reviews?per_page=${CATALOG_REVIEWS_PER_PAGE}&page=${page}`,
      { next: { tags: ["catalog-reviews", `catalog-reviews:${id}`] } },
      "admin",
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
