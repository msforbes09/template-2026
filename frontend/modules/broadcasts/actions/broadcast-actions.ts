"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { AdminBroadcast } from "@/types/broadcast";
import {
  toBroadcastPayload,
  type BroadcastValues,
} from "@/modules/broadcasts/schemas/broadcast-schema";

// Administrator broadcasts. Every route here needs `notifications-broadcast`,
// its own permission group — no role holds it until it is granted.
//
// The lifecycle is draft -> sending -> sent, and creating does NOT deliver.
// Edit, delete and start are draft-only AND creator-only; the API enforces
// both (400 invalid_status / 403 broadcast_not_owned) and the UI hides the
// controls, so the two agree rather than the UI merely hoping.

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return {
      ok: false,
      status: err.status,
      message: safe,
      errors: err.errors,
      code: err.code,
      meta: err.meta,
    };
  }
  void logError(err, { where, audience: "admin" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

function revalidateBroadcasts() {
  revalidateTag("admin-broadcasts", "max");
}

export async function createBroadcast(
  values: BroadcastValues,
): Promise<ActionResult<AdminBroadcast>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminBroadcast }>(
      "/broadcasts",
      { method: "POST", body: JSON.stringify(toBroadcastPayload(values)) },
      "admin",
    );
    revalidateBroadcasts();
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "createBroadcast action");
  }
}

// Replaces the targeting wholesale — omitting the targeting fields retargets
// to everyone. toBroadcastPayload builds the body accordingly, so an edit
// that switches Segment back to Everyone actually widens the audience rather
// than leaving the old filters in place.
export async function updateBroadcast(
  id: number,
  values: BroadcastValues,
): Promise<ActionResult<AdminBroadcast>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminBroadcast }>(
      `/broadcasts/${id}`,
      { method: "PUT", body: JSON.stringify(toBroadcastPayload(values)) },
      "admin",
    );
    revalidateBroadcasts();
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "updateBroadcast action");
  }
}

// Soft delete, drafts only. The row leaves the history rather than being
// tombstoned in it.
export async function deleteBroadcast(id: number): Promise<ActionResult<null>> {
  await requireAdminSession();
  try {
    await apiFetch(`/broadcasts/${id}`, { method: "DELETE" }, "admin");
    revalidateBroadcasts();
    return { ok: true, data: null };
  } catch (err) {
    return toActionResult(err, "deleteBroadcast action");
  }
}

// The irreversible one. Flips the row to `sending` and queues the fan-out;
// there is no recall and no cancel-while-sending. The confirmation that
// guards it lives in the UI, and for the Everyone audience it is a typed one.
export async function startBroadcast(id: number): Promise<ActionResult<AdminBroadcast>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminBroadcast }>(
      `/broadcasts/${id}/start`,
      { method: "POST" },
      "admin",
    );
    revalidateBroadcasts();
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "startBroadcast action");
  }
}
