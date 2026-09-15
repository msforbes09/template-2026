import { humanize } from "@/lib/humanize";

// The real lifecycle status, title-cased, for data surfaces (users table
// badge, view-user modal). Deliberately NOT the sidebar submenu's wording —
// the submenu names what the account can do (Incomplete, Basic Access,
// Developer Access), while these show the status as it actually is.
export const USER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  completed: "Completed",
  for_assessment: "For Assessment",
  for_resubmission: "For Resubmission",
  approved: "Approved",
  suspended: "Suspended",
};

// Legacy statuses still present in old rows (rejected, pending, …) fall back
// to plain humanization rather than disappearing.
export function userStatusLabel(status: string): string {
  return USER_STATUS_LABELS[status] ?? humanize(status);
}
