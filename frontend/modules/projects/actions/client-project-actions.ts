"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { toProjectInput } from "@/modules/projects/lib/project-payload";
import type { ActionResult } from "@/lib/action-result";
import type { DeleteProjectValues } from "@/modules/projects/schemas/delete-project-schema";
import type { ProjectValues } from "@/modules/projects/schemas/project-schema";
import type { Project } from "@/types/project";

// Citizen-side mutations against the User API's `/projects` (all of them
// require an **approved** account — a pending one gets 403 account_pending,
// which the calling screen shows as its own state rather than an error).

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  void logError(err, { where, audience: "client" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// A write invalidates four things: this citizen's list, the project's own
// detail read, the admin queues (an admin may be looking at the same row),
// and the public lists (a delete removes a live project from them).
function revalidateProject(uuid?: string) {
  revalidateTag("my-projects", "max");
  revalidateTag("admin-projects", "max");
  revalidateTag("projects", "max");
  if (uuid) revalidateTag(`projects:${uuid}`, "max");
}

export async function getProject(uuid: string): Promise<ActionResult<Project>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: Project }>(
      `/projects/${uuid}`,
      { next: { tags: [`projects:${uuid}`] } },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getProject action");
  }
}

// Does this project belong to the caller? The PUBLIC project payload carries
// no owner identity at all (by design — public pages name teams, not
// accounts), so the only way to ask is the citizen's own-scoped show, which
// 404s for anyone else's project.
//
// Uncached on purpose: the answer is per-session, and caching it under a
// shared key would hand one citizen another's answer.
//
// Any failure reads as "not the owner". That fails OPEN — a transient error
// shows the review form to an owner, who then meets the API's own refusal,
// which is exactly the behaviour before this existed. Failing the other way
// would silently deny the form to genuine reviewers.
export async function isProjectOwner(uuid: string): Promise<boolean> {
  await requireClientSession();
  try {
    await apiFetch<{ data: Project }>(`/projects/${uuid}`, { cache: "no-store" }, "client");
    return true;
  } catch {
    return false;
  }
}

export async function createProject(values: ProjectValues): Promise<ActionResult<Project>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: Project }>(
      "/projects",
      { method: "POST", body: JSON.stringify(toProjectInput(values)) },
      "client",
    );
    revalidateProject(data.uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createProject action");
  }
}

// A real change resets `status` to draft (the API's rule, not ours) — the
// form warns about that before submitting when a live version exists.
export async function updateProject(
  uuid: string,
  values: ProjectValues,
): Promise<ActionResult<Project>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: Project }>(
      `/projects/${uuid}`,
      // partial: an omitted key means "leave this alone", so a blank
      // optional is sent as null to clear it (see toProjectInput).
      { method: "PUT", body: JSON.stringify(toProjectInput(values, { partial: true })) },
      "client",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateProject action");
  }
}

// Soft delete — it disappears everywhere, including the public site, even if
// a snapshot was live. Takes the account password, which the API verifies
// (`current_password:users`); a missing or wrong one is a 422 on `password`,
// so the caller maps it back onto the field rather than showing a toast.
export async function deleteProject(
  uuid: string,
  values: DeleteProjectValues,
): Promise<ActionResult<null>> {
  await requireClientSession();
  try {
    await apiFetch<{ message: string }>(
      `/projects/${uuid}`,
      { method: "DELETE", body: JSON.stringify(values) },
      "client",
    );
    revalidateProject(uuid);
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "deleteProject action");
  }
}

// draft / for_resubmission → for_assessment. Any other status answers
// 400 invalid_status, so the button that calls this is only rendered for
// those two (see canSubmitProject).
export async function submitProject(uuid: string): Promise<ActionResult<Project>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: Project }>(
      `/projects/${uuid}/submit`,
      { method: "POST" },
      "client",
    );
    revalidateProject(uuid);
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "submitProject action");
  }
}
