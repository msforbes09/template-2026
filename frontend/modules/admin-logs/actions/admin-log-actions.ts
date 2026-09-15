"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type {
  AuditLogDetail,
  AuthAttemptLogDetail,
  ConnectionLogDetail,
} from "@/types/operational-log";

// Detailed shows for the three non-gateway admin log viewers. Each is gated by
// its own permission server-side (connection-logs-view / auth-logs-view /
// audit-logs-view), so a 403 here is meaningful even when the nav rendered.
//
// `id` is the opaque composite "{YYYY_MM}:{id}" the list returns and is passed
// through untouched — it carries its own month, so none of these take a
// `month` param. Encoded because the value contains a colon; the API accepts
// either form.

function toActionResult(err: unknown, where: string): ActionResult<never> {
  if (isApiError(err)) {
    const safe =
      err.status >= 500 && env.NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message;
    return { ok: false, status: err.status, message: safe, errors: err.errors };
  }
  void logError(err, { where, audience: "admin" });
  return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
}

async function showLog<T>(path: string, where: string): Promise<ActionResult<T>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: T }>(path, {}, "admin");
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, where);
  }
}

export async function getConnectionLog(id: string): Promise<ActionResult<ConnectionLogDetail>> {
  return showLog<ConnectionLogDetail>(
    `/connection-logs/${encodeURIComponent(id)}`,
    "getConnectionLog action",
  );
}

export async function getAuthAttemptLog(id: string): Promise<ActionResult<AuthAttemptLogDetail>> {
  return showLog<AuthAttemptLogDetail>(
    `/auth-attempt-logs/${encodeURIComponent(id)}`,
    "getAuthAttemptLog action",
  );
}

export async function getAuditLog(id: string): Promise<ActionResult<AuditLogDetail>> {
  return showLog<AuditLogDetail>(`/audit-logs/${encodeURIComponent(id)}`, "getAuditLog action");
}
