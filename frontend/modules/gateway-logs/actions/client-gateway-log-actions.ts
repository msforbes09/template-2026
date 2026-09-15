"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { GatewayLogDetail } from "@/types/gateway-log";

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

// The citizen's own detailed show (User API GET /gateway-logs/{id}). A log
// that isn't theirs is a 404, and the shape omits the partner round-trip and
// any caller identity by design.
//
// `id` is the composite "{YYYY_MM}:{id}" string the list returns and is passed
// through untouched — it carries its own month, so the `?month` param this
// call used to send is gone (2026-08-15 handoff §1/§7). Encoded because the
// value contains a colon.
export async function getMyGatewayLog(id: string): Promise<ActionResult<GatewayLogDetail>> {
  await requireClientSession();
  try {
    const { data } = await apiFetch<{ data: GatewayLogDetail }>(
      `/gateway-logs/${encodeURIComponent(id)}`,
      {},
      "client",
    );
    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "getMyGatewayLog action");
  }
}
