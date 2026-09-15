"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { AdminGatewayLogDetail } from "@/types/gateway-log";

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

// Detailed show for any user's gateway log (Admin API GET /gateway-logs/{id}).
// Requires `gateway-logs-view`; 403 without it, 404 for an unknown id.
//
// `id` is the opaque composite "{YYYY_MM}:{id}" the list returns. It encodes
// its own month, so the `?month` this call used to append is gone as of the
// 2026-08-15 handoff (§1). Encoded because the value contains a colon — the
// API accepts either form, having verified both reach the route.
export async function getGatewayLog(id: string): Promise<ActionResult<AdminGatewayLogDetail>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminGatewayLogDetail }>(
      `/gateway-logs/${encodeURIComponent(id)}`,
      {},
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getGatewayLog action");
  }
}

// Detailed show scoped to one citizen (Admin API
// GET /users/{uuid}/gateway-logs/{id}) — a log that isn't theirs is a 404.
export async function getUserGatewayLog(
  uuid: string,
  id: string,
): Promise<ActionResult<AdminGatewayLogDetail>> {
  await requireAdminSession();
  try {
    const { data } = await apiFetch<{ data: AdminGatewayLogDetail }>(
      `/users/${uuid}/gateway-logs/${encodeURIComponent(id)}`,
      {},
      "admin",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getUserGatewayLog action");
  }
}
