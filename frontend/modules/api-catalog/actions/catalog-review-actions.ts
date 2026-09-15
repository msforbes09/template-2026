"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession, requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import { getAdminCatalogReviews } from "@/modules/api-catalog/lib/get-catalog-reviews";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import type { Paginated } from "@/types/pagination";
import type { AdminApiCatalogReview, ApiCatalogReview } from "@/types/review";

// A catalog review is a singleton per developer per catalog: one URL,
// user/api-catalogs/{identifier}/review, with the verb deciding what happens.
//
// Unlike project reviews, the account must be an APPROVED DEVELOPER — a plain
// authenticated citizen gets 403 `account_pending` across the whole surface.

function toActionResult(err: unknown, where: string, audience: "client" | "admin"): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    // `code` is carried through so a caller can branch on the specific
    // failure (review_already_exists, account_pending, reply_not_allowed,
    // too_many_requests) rather than on a status that means several things.
    return {
      ok: false,
      status: err.status,
      message: safe,
      errors: err.errors,
      code: err.code,
      meta: err.meta,
    };
  }
  void logError(err, { where, audience });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// A write changes the public thread AND the catalog's rating aggregates,
// which ride on every catalog list card and show — public, signed-in and
// admin alike, so all of those caches have to drop.
function revalidateCatalogReviews(identifier: string) {
  revalidateTag("catalog-reviews", "max");
  revalidateTag(`catalog-reviews:${identifier}`, "max");
  revalidateTag("api-catalogs", "max");
  revalidateTag(`api-catalogs:${identifier}`, "max");
}

export type CatalogReviewValues = {
  rating: number;
  comment: string;
  is_anonymous: boolean;
};

// PUT is a full replace, so both verbs send all three fields.
function toPayload(values: CatalogReviewValues) {
  return {
    rating: values.rating,
    comment: values.comment.trim() ? values.comment.trim() : null,
    is_anonymous: values.is_anonymous ? 1 : 0,
  };
}

// The citizen review surface is flag-gated (`api_catalog_reviews`, read from
// GET common/feature-flags). With it off CatalogReviews renders nothing — but a server
// action is a public HTTP endpoint whose id ships in the client bundle, so
// hiding the controls does not stop a direct POST. Enforcing it here is what
// makes the switch real rather than cosmetic (see security.md rule 1).
//
// 404 mirrors what the backend returns when ITS switch is off, so a caller
// that already handles "disabled" behaves the same whichever half is off.
//
// Admin moderation is deliberately NOT gated: an administrator can still read
// and reply to what was written while the feature was on.
function catalogReviewsDisabled(): ActionResult<never> {
  return {
    ok: false,
    status: 404,
    message: "API catalog reviews are not available.",
    errors: {},
  };
}

// Returns null rather than an error when there is no review yet: 404 here is
// the "write a review" state, not a failure.
//
// It is also what a disabled kill switch looks like, which is why the caller
// is told which — a developer staring at a write form that 404s on submit is
// worse than not offering it.
export async function getMyCatalogReview(
  identifier: string,
): Promise<ActionResult<ApiCatalogReview | null>> {
  if (!(await isFeatureEnabled("api_catalog_reviews"))) return catalogReviewsDisabled();
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ApiCatalogReview }>(
      `/api-catalogs/${encodeURIComponent(identifier)}/review`,
      { cache: "no-store" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    if (isApiError(err) && err.status === 404) return { ok: true, data: null };
    return toActionResult(err, "getMyCatalogReview action", "client");
  }
}

export async function createCatalogReview(
  identifier: string,
  values: CatalogReviewValues,
): Promise<ActionResult<ApiCatalogReview>> {
  if (!(await isFeatureEnabled("api_catalog_reviews"))) return catalogReviewsDisabled();
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ApiCatalogReview }>(
      `/api-catalogs/${encodeURIComponent(identifier)}/review`,
      { method: "POST", body: JSON.stringify(toPayload(values)) },
      "client",
    );
    revalidateCatalogReviews(identifier);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createCatalogReview action", "client");
  }
}

export async function updateCatalogReview(
  identifier: string,
  values: CatalogReviewValues,
): Promise<ActionResult<ApiCatalogReview>> {
  if (!(await isFeatureEnabled("api_catalog_reviews"))) return catalogReviewsDisabled();
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ApiCatalogReview }>(
      `/api-catalogs/${encodeURIComponent(identifier)}/review`,
      { method: "PUT", body: JSON.stringify(toPayload(values)) },
      "client",
    );
    revalidateCatalogReviews(identifier);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateCatalogReview action", "client");
  }
}

export async function deleteCatalogReview(
  identifier: string,
): Promise<ActionResult<null>> {
  if (!(await isFeatureEnabled("api_catalog_reviews"))) return catalogReviewsDisabled();
  await requireClientSession();
  try {
    await apiFetch<{ message: string }>(
      `/api-catalogs/${encodeURIComponent(identifier)}/review`,
      { method: "DELETE" },
      "client",
    );
    revalidateCatalogReviews(identifier);
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "deleteCatalogReview action", "client");
  }
}

// Keyed on the REVIEW uuid, not the catalog's. `identifier` rides along purely
// to revalidate the right thread.
//
// Author only: replying to somebody else's thread is 403 `reply_not_allowed`.
// There is no "owner" party here the way projects have one — a catalog has no
// owning citizen, so the only other voice on a thread is an administrator,
// through the admin action below.
export async function replyToCatalogReview(
  reviewUuid: string,
  identifier: string,
  comment: string,
): Promise<ActionResult<null>> {
  if (!(await isFeatureEnabled("api_catalog_reviews"))) return catalogReviewsDisabled();
  await requireClientSession();
  try {
    await apiFetch(
      `/api-catalog-reviews/${reviewUuid}/replies`,
      { method: "POST", body: JSON.stringify({ comment: comment.trim() }) },
      "client",
    );
    revalidateCatalogReviews(identifier);
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "replyToCatalogReview action", "client");
  }
}

// The OFFICIAL response. Needs api-catalogs-manage, and renders publicly as
// the eGov team rather than as the administrator who wrote it — the public
// resource never names them.
export async function replyToCatalogReviewAsAdmin(
  reviewUuid: string,
  identifier: string | number,
  comment: string,
): Promise<ActionResult<null>> {
  await requireAdminSession();
  try {
    await apiFetch(
      `/api-catalog-reviews/${reviewUuid}/replies`,
      { method: "POST", body: JSON.stringify({ comment: comment.trim() }) },
      "admin",
    );
    revalidateCatalogReviews(String(identifier));
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "replyToCatalogReviewAsAdmin action", "admin");
  }
}

// Action wrapper over the server-only reader, so the admin modal (a client
// component that loads its thread on open) can reach it. `disabled` is passed
// through as a code rather than an error message: the modal shows "reviews
// are switched off", not "something went wrong".
export async function loadAdminCatalogReviews(
  id: number | string,
  page = "1",
): Promise<ActionResult<Paginated<AdminApiCatalogReview> & { canReply: boolean }>> {
  try {
    const [result, canReply] = await Promise.all([
      getAdminCatalogReviews(id, page),
      // The official-reply route needs api-catalogs-manage on TOP of the
      // api-catalogs-view that gates the thread itself. Resolved here, with
      // the thread, so a view-only administrator is never shown a reply box
      // that would 403 on submit.
      adminCan(PERMISSIONS.apiCatalogsManage),
    ]);
    if (result.ok) return { ok: true, data: { ...result.page, canReply } };
    if (result.disabled) {
      return {
        ok: false,
        status: 404,
        message: "API-catalog reviews are switched off.",
        errors: {},
        code: "reviews_disabled",
      };
    }
    return { ok: false, status: 500, message: result.message, errors: {} };
  } catch (err) {
    return toActionResult(err, "loadAdminCatalogReviews action", "admin");
  }
}
