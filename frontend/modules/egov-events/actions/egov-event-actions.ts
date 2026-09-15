"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { AdminEgovEvent } from "@/types/project";
import type { EgovEventValues } from "@/modules/egov-events/schemas/egov-event-schema";

// Administrator CRUD for eGov events. Gated on the `egov-events-view` /
// `egov-events-manage` permissions, which are NOT covered by `projects-*` —
// a role needs them granted explicitly.
//
// Admin routes bind by numeric id (events carry no uuid); the public browses
// by slug.

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors, code: err.code, meta: err.meta };
  }
  void logError(err, { where, audience: "admin" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// An event change re-scopes the public showcase immediately, so both the event
// list and the project lists that hang off it are invalidated.
function revalidateEvents() {
  revalidateTag("egov-events", "max");
  revalidateTag("projects", "max");
  revalidateTag("admin-egov-events", "max");
}

// `slug` is never sent: it is generated from the name and a supplied value is
// ignored. Empty strings become null so a cleared field is actually cleared.
function toPayload(values: EgovEventValues) {
  const orNull = (value: string) => (value.trim() ? value.trim() : null);
  return {
    name: values.name.trim(),
    description: orNull(values.description),
    is_active: values.is_active,
    is_published: values.is_published,
    starts_at: orNull(values.starts_at),
    ends_at: orNull(values.ends_at),
    photo_uuid: orNull(values.photo_uuid),
    meta: values.meta.trim() ? (JSON.parse(values.meta) as Record<string, unknown>) : null,
    // Always sent, because the key REPLACES the whole set rather than merging
    // into it: omitting it leaves the old tags in place, so a form that
    // cleared them would appear to save and change nothing. [] clears.
    custom_tags: values.custom_tags.map((tag) => ({
      name: tag.name.trim(),
      color: tag.color.trim(),
      icon: tag.icon.trim(),
    })),
  };
}

export async function getAdminEgovEvent(id: number): Promise<ActionResult<AdminEgovEvent>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminEgovEvent }>(
      `/egov-events/${id}`,
      { next: { tags: [`admin-egov-events:${id}`] } },
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getAdminEgovEvent action");
  }
}

export async function createEgovEvent(
  values: EgovEventValues,
): Promise<ActionResult<AdminEgovEvent>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminEgovEvent }>(
      "/egov-events",
      { method: "POST", body: JSON.stringify(toPayload(values)) },
      "admin",
    );
    revalidateEvents();
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createEgovEvent action");
  }
}

export async function updateEgovEvent(
  id: number,
  values: EgovEventValues,
): Promise<ActionResult<AdminEgovEvent>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminEgovEvent }>(
      `/egov-events/${id}`,
      { method: "PUT", body: JSON.stringify(toPayload(values)) },
      "admin",
    );
    revalidateEvents();
    revalidateTag(`admin-egov-events:${id}`, "max");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateEgovEvent action");
  }
}

export async function deleteEgovEvent(id: number): Promise<ActionResult<null>> {
  await requireAdminSession();
  try {
    await apiFetch<{ message: string }>(`/egov-events/${id}`, { method: "DELETE" }, "admin");
    revalidateEvents();
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "deleteEgovEvent action");
  }
}

// Every event, active or closed, for the admin project form's picker — an
// admin may move a project onto a past event to curate it, which the public
// list (active only) cannot offer.
export async function getEgovEventOptions(): Promise<AdminEgovEvent[]> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminEgovEvent[] }>(
      "/egov-events?per_page=100&order_by=starts_at&sort=desc",
      { next: { tags: ["admin-egov-events"] } },
      "admin",
    );
    return data;
  } catch {
    // The picker simply doesn't render; the rest of the form still works.
    return [];
  }
}
