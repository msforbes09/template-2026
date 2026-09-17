"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";

// POST administrator/password/waive-expiry uses one of the postponements an
// expired password is allowed and answers with the refreshed profile. The
// caller refreshes the route afterwards: getAdminProfile() is a per-request
// cache, so the banner's own server-rendered state only changes on the next
// render.
export async function waivePasswordExpiry(): Promise<ActionResult<null>> {
  await requireAdminSession();

  try {
    await apiFetch("/password/waive-expiry", { method: "POST" }, "admin");
  } catch (err) {
    if (isApiError(err)) {
      const safe =
        err.status >= 500 && env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : err.message;
      return { ok: false, status: err.status, message: safe, errors: err.errors, code: err.code };
    }
    await logError(err, { where: "waivePasswordExpiry action", audience: "admin" });
    return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
  }

  return { ok: true, data: null };
}
