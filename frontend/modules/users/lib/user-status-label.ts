import { humanize } from "@/lib/humanize";

// The lifecycle status, title-cased, for data surfaces (users table badge,
// view-user modal).
export const USER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  completed: "Completed",
};

// A status this build does not know falls back to plain humanization rather
// than disappearing.
export function userStatusLabel(status: string): string {
  return USER_STATUS_LABELS[status] ?? humanize(status);
}
