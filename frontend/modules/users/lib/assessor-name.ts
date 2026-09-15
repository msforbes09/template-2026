import type { AdminUserAssessor } from "@/types/admin-user";

// Display name for an assessment/approval assessor. The Admin API's OpenAPI
// doc declares these as a bare `object` with no property schema, so every
// field is read defensively (see the AdminUserAssessor note).
export function assessorName(assessor: AdminUserAssessor | undefined): string | null {
  if (!assessor) return null;
  const first = typeof assessor.first_name === "string" ? assessor.first_name : null;
  const last = typeof assessor.last_name === "string" ? assessor.last_name : null;
  const name = [first, last].filter(Boolean).join(" ");
  if (name) return name;
  return typeof assessor.email === "string" ? assessor.email : null;
}
