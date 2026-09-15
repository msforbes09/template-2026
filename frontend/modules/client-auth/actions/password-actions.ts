"use server";

import { apiFetch } from "@/lib/api-client";
import { isApiError } from "@/lib/api-error";
import { logError } from "@/lib/log-error";
import { requireClientSession } from "@/lib/auth/dal";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/action-result";
import type { ChangePasswordValues } from "@/modules/client-auth/schemas/change-password-schema";
import { writeClientSession } from "@/modules/client-auth/actions/session-actions";

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

// POST /user/change-password revokes every existing token and returns a
// fresh one — unlike modules/admin/actions/change-password.ts's response
// (which is `{ data: Administrator }`), the User API's real response here
// is `{ token }` (confirmed against the live API doc), so the local Better
// Auth session must be rewritten with that new token immediately or the
// user's very next request 401s against their now-revoked old one.
export async function changeClientPassword(
  email: string,
  values: ChangePasswordValues,
): Promise<ActionResult<{ token: string }>> {
  await requireClientSession();
  try {
    const { token } = await apiFetch<{ token: string }>(
      "/change-password",
      { method: "POST", body: JSON.stringify(values) },
      "client",
    );
    // The password change already rotated the backend token, so the old local
    // session now holds a dead one. If the new session cannot be written the
    // caller must not be told the change succeeded silently — they would be
    // left holding a revoked token behind a still-valid cookie.
    const written = await writeClientSession({ username: email, accessToken: token });
    if (!written.ok) {
      // 401: the token the backend just issued was not accepted back, so the
      // session is genuinely unauthenticated rather than malformed.
      return { ok: false, status: 401, message: written.message, errors: {} };
    }
    return { ok: true, data: { token } };
  } catch (err) {
    return toActionResult(err, "changeClientPassword action");
  }
}
