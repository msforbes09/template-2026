import type { ActionResult } from "@/lib/action-result";
import type { AdminProject } from "@/types/project";

// The WS refuses a second project claim with 400
// assessment_already_in_progress, carrying the held project in meta. This
// parses that one failure into what the transfer dialog needs — anything else
// (success, other errors, malformed meta) is null and follows the normal
// toast path. Sibling of the users module's claimConflict; the meta shapes
// differ (name here, display_name there), so no shared generic.
export function projectClaimConflict(
  result: ActionResult<AdminProject>,
): { uuid: string; name: string } | null {
  if (result.ok || result.code !== "assessment_already_in_progress") return null;

  const meta = result.meta as { uuid?: unknown; name?: unknown } | undefined;
  if (typeof meta?.uuid !== "string" || typeof meta.name !== "string") return null;

  return { uuid: meta.uuid, name: meta.name };
}
