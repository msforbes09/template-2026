import "server-only";
import { apiFetch } from "@/lib/api-client";
import { requireAdminSession } from "@/lib/auth/dal";
import { safeErrorMessage } from "@/lib/safe-error-message";
import { isApiError } from "@/lib/api-error";
import type { AdminFeatureFlag } from "@/types/feature-flag";

// GET administrator/feature-flags — every registered flag with the state that
// is actually in force: a stored admin override, or the backend's environment
// default when nothing is stored.
//
// `forbidden` is its own outcome. The whole surface is gated on the
// `developer-access` ability, which only is_developer administrators hold, so
// a 403 here means "not a developer admin" rather than a failure — and the
// screen says so in those words instead of rendering an error.
export type AdminFeatureFlagsResult =
  | { ok: true; flags: AdminFeatureFlag[] }
  | { ok: false; forbidden: true }
  | { ok: false; forbidden: false; message: string };

export async function getAdminFeatureFlags(): Promise<AdminFeatureFlagsResult> {
  await requireAdminSession();

  try {
    // Never cached: this screen exists to show the live state of a switch
    // somebody is in the middle of flipping, and a stale row here would have
    // an administrator toggling against a value that is not there any more.
    const { data } = await apiFetch<{ data: AdminFeatureFlag[] }>(
      "/feature-flags",
      { cache: "no-store" },
      "admin",
    );
    return { ok: true, flags: data };
  } catch (err) {
    if (isApiError(err) && err.status === 403) return { ok: false, forbidden: true };
    return {
      ok: false,
      forbidden: false,
      message: safeErrorMessage(err, "Something went wrong loading the system controls."),
    };
  }
}
