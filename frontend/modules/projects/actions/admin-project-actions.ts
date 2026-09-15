"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { toProjectInput, withEvent } from "@/modules/projects/lib/project-payload";
import type { ActionResult } from "@/lib/action-result";
import type { ProjectValues } from "@/modules/projects/schemas/project-schema";
import type { AdminProject } from "@/types/project";

// Administrator-side moderation against `/projects` (permission
// `projects-view` to read, `projects-manage` to write — the API answers 403
// forbidden either way, these actions just shape the result).
//
// The lane, in order: a submission arrives as `for_assessment` → an admin
// claims it (toggle-assessment) → publish (freeze a snapshot, go live) or
// send-back (with remarks). `toggle-publish` is the separate offline/online
// switch for something already published at least once.

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    // `code`/`meta` ride along like in the users actions — the claim-conflict
    // dialog keys on code assessment_already_in_progress and reads the held
    // project from meta; dropping them here silently degrades that dialog to
    // a dead-end toast (2026-09-03, the bug that added this line).
    return { ok: false, status: err.status, message: safe, errors: err.errors, code: err.code, meta: err.meta };
  }
  void logError(err, { where, audience: "admin" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

function revalidateProject(uuid?: string) {
  revalidateTag("admin-projects", "max");
  revalidateTag("my-projects", "max");
  revalidateTag("projects", "max");
  if (uuid) revalidateTag(`projects:${uuid}`, "max");
}

// The show endpoint is the only one carrying `published_snapshot`, which the
// review screen diffs the working copy against.
export async function getAdminProject(uuid: string): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}`,
      { next: { tags: [`projects:${uuid}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getAdminProject action");
  }
}

// An admin-created project lands as `for_publishing`, claimed by its creator,
// and is NOT live until published.
export async function createAdminProject(
  values: ProjectValues,
): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      "/projects",
      { method: "POST", body: JSON.stringify(toProjectInput(values)) },
      "admin",
    );
    revalidateProject(data.uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createAdminProject action");
  }
}

// Any real change moves the working copy to `for_publishing` and claims it
// for the editing admin.
export async function updateAdminProject(
  uuid: string,
  values: ProjectValues,
): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}`,
      // partial: an omitted key means "leave this alone", so a blank
      // optional is sent as null to clear it (see toProjectInput).
      {
        method: "PUT",
        // Unlike a citizen, an admin MAY move a project between events or
        // clear it, so the field is sent explicitly rather than omitted.
        body: JSON.stringify(
          withEvent(toProjectInput(values, { partial: true }), values.egov_event_id),
        ),
      },
      "admin",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateAdminProject action");
  }
}

export async function deleteAdminProject(uuid: string): Promise<ActionResult<null>> {
  await requireAdminSession();
  try {
    await apiFetch<{ message: string }>(`/projects/${uuid}`, { method: "DELETE" }, "admin");
    revalidateProject(uuid);
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "deleteAdminProject action");
  }
}

// Claim, or release your own claim. Only valid on for_assessment /
// for_publishing / published; another admin's claim answers 403
// assessment_not_owned.
// `transfer` is the retry flag for the one-claim-per-admin rule: a plain
// claim while holding another project fails 400 assessment_already_in_progress
// (the held project in meta — see projectClaimConflict); resending with
// transfer releases the caller's own claim and claims this project atomically.
// It never releases another admin's claim.
export async function toggleProjectAssessment(
  uuid: string,
  transfer = false,
): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}/toggle-assessment`,
      { method: "POST", ...(transfer ? { body: JSON.stringify({ transfer: true }) } : {}) },
      "admin",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "toggleProjectAssessment action");
  }
}

// Freezes the current working copy as the public snapshot. Needs
// for_assessment/for_publishing AND your own claim.
export async function publishProject(uuid: string): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}/publish`,
      { method: "POST" },
      "admin",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "publishProject action");
  }
}

// The offline/online switch for a project published at least once — it keeps
// the snapshot either way, so bringing it back online shows the same version.
// Anything never published answers 400 invalid_status.
export async function toggleProjectPublish(uuid: string): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}/toggle-publish`,
      { method: "POST" },
      "admin",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "toggleProjectPublish action");
  }
}

// for_assessment + your claim → for_resubmission, with remarks the owner
// sees on their project.
export async function sendBackProject(
  uuid: string,
  remarks: string,
): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}/send-back`,
      { method: "POST", body: JSON.stringify({ assessment_remarks: remarks }) },
      "admin",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "sendBackProject action");
  }
}

// Syncs the WHOLE tag set (adds missing, removes absent, [] clears). Every
// value must be a name from GET common/project-tags or the API answers
// 422 tags.N. Takes effect publicly at once — adding "TOP 30" puts a live
// project on the TOP 30 list.
export async function syncProjectTags(
  uuid: string,
  tags: string[],
): Promise<ActionResult<AdminProject>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminProject }>(
      `/projects/${uuid}/tags`,
      { method: "PUT", body: JSON.stringify({ tags }) },
      "admin",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "syncProjectTags action");
  }
}
