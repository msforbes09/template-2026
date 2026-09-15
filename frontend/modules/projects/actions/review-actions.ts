"use server";

import { updateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import { isFeatureEnabled } from "@/modules/feature-flags/lib/get-feature-flags";
import type { ProjectReview } from "@/types/project";

// A review is a singleton per user per project: one URL,
// user/projects/{uuid}/review, with the verb deciding what happens. Any
// authenticated citizen can write one — approval is NOT required here, unlike
// authoring a project — but nobody can review their own.

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    // `code` is carried through so the caller can branch on the specific
    // failure (review_already_exists, cannot_review_own_project,
    // reply_not_allowed) instead of on a 400 that means several things.
    return { ok: false, status: err.status, message: safe, errors: err.errors, code: err.code, meta: err.meta };
  }
  void logError(err, { where, audience: "client" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// A write changes the public thread and the project's rating aggregates, which
// ride on every project list card and show.
//
// `updateTag`, not `revalidateTag(tag, "max")`. The latter is
// stale-while-revalidate: it marks the tag stale and serves the STALE thread
// on the next visit while fetching fresh in the background — so the author of
// a reply lands back on a thread that does not contain it, and has to reload
// to see their own words. `updateTag` expires immediately and the next read
// blocks for fresh data, which is the read-your-own-writes behaviour a
// mutation wants. It is Server-Action-only, which every caller here is.
function revalidateReviews(uuid: string) {
  updateTag("project-reviews");
  updateTag(`project-reviews:${uuid}`);
  updateTag("projects");
  updateTag(`projects:${uuid}`);
  updateTag("my-projects");
  updateTag("admin-projects");
}

export type ReviewValues = {
  rating: number;
  comment: string;
  is_anonymous: boolean;
};

// The citizen project-review surface is flag-gated (`project_reviews`, read
// from GET common/feature-flags). With it off ProjectReviews renders nothing — but a server
// action is a public HTTP endpoint whose id ships in the client bundle, so
// hiding the controls does not stop a direct POST. Enforcing it here is what
// makes the switch real rather than cosmetic (see security.md rule 16).
//
// 404 mirrors what the backend returns when ITS half is off, so a caller that
// already handles "disabled" behaves the same whichever side refused.
//
// Admin reads are deliberately NOT gated by this flag: an administrator can
// still read what was written while the feature was on. (The BACKEND gates its
// admin route too, so with that half off the admin thread 404s regardless —
// see AdminProjectReviews, which renders that as "switched off".)
function projectReviewsDisabled(): ActionResult<never> {
  return {
    ok: false,
    status: 404,
    message: "Project reviews are not available.",
    errors: {},
    code: "reviews_disabled",
  };
}

// PUT is a full replace, so both verbs send all three fields.
function toPayload(values: ReviewValues) {
  return {
    rating: values.rating,
    comment: values.comment.trim() ? values.comment.trim() : null,
    is_anonymous: values.is_anonymous ? 1 : 0,
  };
}

// Returns null rather than an error when there is no review yet: 404 here is
// the "write a review" state, not a failure.
export async function getMyReview(
  uuid: string,
): Promise<ActionResult<ProjectReview | null>> {
  if (!(await isFeatureEnabled("project_reviews"))) return projectReviewsDisabled();
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ProjectReview }>(
      `/projects/${uuid}/review`,
      { cache: "no-store" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    if (isApiError(err) && err.status === 404) return { ok: true, data: null };
    return toActionResult(err, "getMyReview action");
  }
}

export async function createReview(
  uuid: string,
  values: ReviewValues,
): Promise<ActionResult<ProjectReview>> {
  if (!(await isFeatureEnabled("project_reviews"))) return projectReviewsDisabled();
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ProjectReview }>(
      `/projects/${uuid}/review`,
      { method: "POST", body: JSON.stringify(toPayload(values)) },
      "client",
    );
    revalidateReviews(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createReview action");
  }
}

export async function updateReview(
  uuid: string,
  values: ReviewValues,
): Promise<ActionResult<ProjectReview>> {
  if (!(await isFeatureEnabled("project_reviews"))) return projectReviewsDisabled();
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: ProjectReview }>(
      `/projects/${uuid}/review`,
      { method: "PUT", body: JSON.stringify(toPayload(values)) },
      "client",
    );
    revalidateReviews(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateReview action");
  }
}

export async function deleteReview(uuid: string): Promise<ActionResult<null>> {
  if (!(await isFeatureEnabled("project_reviews"))) return projectReviewsDisabled();
  await requireClientSession();
  try {
    await apiFetch<{ message: string }>(
      `/projects/${uuid}/review`,
      { method: "DELETE" },
      "client",
    );
    revalidateReviews(uuid);
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "deleteReview action");
  }
}

// The reply route is keyed on the REVIEW uuid, not the project's — the only
// endpoint in this module that is. `projectUuid` is passed alongside purely to
// revalidate the right thread.
export async function replyToReview(
  reviewUuid: string,
  projectUuid: string,
  comment: string,
): Promise<ActionResult<null>> {
  if (!(await isFeatureEnabled("project_reviews"))) return projectReviewsDisabled();
  await requireClientSession();
  try {
    await apiFetch(
      `/project-reviews/${reviewUuid}/replies`,
      { method: "POST", body: JSON.stringify({ comment: comment.trim() }) },
      "client",
    );
    revalidateReviews(projectUuid);
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "replyToReview action");
  }
}
