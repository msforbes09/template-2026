"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";

type HorizonAccess = { url: string; expires_at: string };

// POST administrator/horizon/access — mints a one-minute signed link into the
// Horizon dashboard. The client opens it in a new tab (OpenHorizonButton); the
// link lands on the Horizon host, authorises that browser session and
// redirects into the dashboard.
//
// Gated on `developer-access` server-side; the button is only rendered after
// the System Controls fetch succeeded, but as an exported server action this is
// still a public endpoint, so requireAdminSession plus the backend's 403 are
// what enforce it (security.md rule 16).
export async function getHorizonAccessUrl(): Promise<ActionResult<{ url: string }>> {
  await requireAdminSession();

  try {
    const { data } = await apiFetch<{ data: HorizonAccess }>(
      "/horizon/access",
      { method: "POST" },
      "admin",
    );
    return { ok: true, data: { url: data.url } };
  } catch (err) {
    if (isApiError(err)) {
      const safe =
        err.status >= 500 && env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : err.message;
      return { ok: false, status: err.status, message: safe, errors: err.errors };
    }
    void logError(err, { where: "getHorizonAccessUrl action", audience: "admin" });
    return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
  }
}
