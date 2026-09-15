"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireAdminSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import { clearLocalAdminSession } from "@/modules/admin/lib/clear-local-admin-session";
import type { ChangePasswordValues } from "@/modules/admin/schemas/change-password-schema";

// POST administrator/change-password answers `{ token }`, NOT `{ data:
// Administrator }` — confirmed against both the checked-out controller and the
// deployed OpenAPI document, whose 200 reads "all prior tokens are revoked and
// a fresh one is returned". Administrator::changePassword() calls
// authenticate(), which does `$this->tokens()->delete()` before issuing the
// new one, so the Bearer this session is holding is dead the moment the change
// succeeds.
//
// This action used to destructure a `data` key that was never in the response
// and throw the new token away, which left the admin behind a still-valid
// cookie wrapped around a revoked token: the modal closed, the console looked
// signed in, and every subsequent read 401'd. The forced temporary-password
// flow hit it every time.
//
// We END THE SESSION rather than adopting the returned token (which is what
// the citizen side does — see changeClientPassword). Re-authenticating is the
// point here: it proves the admin knows the password they just set rather than
// riding the session that set it, and the backend resets their two-factor
// state in the same call, so the next sign-in is the right place to pick that
// up again.
export async function changeAdminPassword(
  values: ChangePasswordValues,
): Promise<ActionResult<null>> {
  await requireAdminSession();

  try {
    await apiFetch<{ token: string }>(
      "/change-password",
      { method: "POST", body: JSON.stringify(values) },
      "admin",
    );
  } catch (err) {
    if (isApiError(err)) {
      const safe =
        err.status >= 500 && env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : err.message;
      return { ok: false, status: err.status, message: safe, errors: err.errors };
    }
    await logError(err, { where: "changeAdminPassword action", audience: "admin" });
    return { ok: false, status: 500, message: "Something went wrong.", errors: {} };
  }

  // Only after the change is known to have succeeded. Cleared local-only: the
  // backend has already revoked the token, so POST /logout would 401 and
  // report itself to Slack on every successful password change.
  await clearLocalAdminSession();
  return { ok: true, data: null };
}
