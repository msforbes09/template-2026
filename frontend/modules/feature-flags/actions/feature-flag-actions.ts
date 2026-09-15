"use server";

import { revalidateTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import { FEATURE_FLAGS_TAG } from "@/modules/feature-flags/lib/get-feature-flags";
import type { ActionResult } from "@/lib/action-result";
import type { AdminFeatureFlag } from "@/types/feature-flag";

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

// PUT administrator/feature-flags/{name} — stores a runtime override.
//
// Gated on the `developer-access` ability, which only is_developer
// administrators receive at login. The screen is hidden without it, but this
// is an exported server action and therefore a public HTTP endpoint whose id
// ships in the client bundle, so requireAdminSession plus the backend's own
// 403 are what actually enforce it (security.md rule 16). Nothing here should
// ever be relaxed on the assumption that the nav entry is hidden.
//
// Errors worth branching on: 403 insufficient_permissions (not a developer
// admin), 404 (unknown flag name), 422 (missing or invalid `enabled`).
export async function setFeatureFlag(
  name: string,
  enabled: boolean,
): Promise<ActionResult<AdminFeatureFlag>> {
  await requireAdminSession();

  try {
    const { data } = await apiFetch<{ data: AdminFeatureFlag }>(
      `/feature-flags/${encodeURIComponent(name)}`,
      { method: "PUT", body: JSON.stringify({ enabled: enabled ? 1 : 0 }) },
      "admin",
    );

    // THE LOAD-BEARING LINE. Every citizen-facing surface reads the flag map
    // through getFeatureFlags, which is cached with cacheLife("minutes") — so
    // without this, a flip an administrator just made would take up to a
    // minute to appear and they would sit there pressing it again. Dropping
    // the tag makes the very next read fetch fresh.
    revalidateTag(FEATURE_FLAGS_TAG, "max");

    return { ok: true, data };
  } catch (err) {
    return toActionResult(err, "setFeatureFlag action");
  }
}
