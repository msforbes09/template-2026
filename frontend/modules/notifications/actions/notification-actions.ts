"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { AppNotification, MarkAllReadResult } from "@/types/notification";

// Both routes are deliberately exempt from the account freeze on the backend:
// a SUSPENDED citizen must still be able to read and dismiss the notice that
// tells them they are suspended. So neither of these gates on account status
// beyond requiring a session.

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
  void logError(err, { where, audience: "client" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

// Idempotent server-side, so a double click is harmless. A foreign or unknown
// id answers 404 — which is the same answer for "not yours" and "never
// existed", and correctly tells the caller nothing about either.
export async function markNotificationRead(
  id: number,
): Promise<ActionResult<AppNotification>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: AppNotification }>(
      `/notifications/${id}/read`,
      { method: "POST" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "markNotificationRead action");
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult<MarkAllReadResult>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: MarkAllReadResult }>(
      "/notifications/read-all",
      { method: "POST" },
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "markAllNotificationsRead action");
  }
}
