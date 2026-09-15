import type { ActionResult } from "@/lib/action-result";
import type { AdminUser } from "@/types/admin-user";

// The WS refuses a second assessment claim with 400
// assessment_already_in_progress, carrying the held user in meta. This parses
// that one failure into what the transfer dialog needs — anything else
// (success, other errors, malformed meta) is null and follows the normal
// toast path.
export function claimConflict(
  result: ActionResult<AdminUser>,
): { uuid: string; displayName: string } | null {
  if (result.ok || result.code !== "assessment_already_in_progress") return null;

  const meta = result.meta as { uuid?: unknown; display_name?: unknown } | undefined;
  if (typeof meta?.uuid !== "string" || typeof meta.display_name !== "string") return null;

  return { uuid: meta.uuid, displayName: meta.display_name };
}
