// The list shows ONE timestamp column, chosen by the selected status view:
// the all-users view answers "when were they last here", and each status view
// answers "when did they land in this queue". Values render as the API's own
// Y-m-d H:i:s strings, so the field name is all the column needs.
//
// Submitted/Returned lean on updated_at — the WS stamps no dedicated
// transition column for those two, and the row's last change IS that
// transition for accounts sitting in either queue (also what the list is
// already sorted by there).
export type UserListDateColumn = {
  header: string;
  field:
    | "last_login_at"
    | "created_at"
    | "profile_completed_at"
    | "updated_at"
    | "approved_at"
    | "suspended_at";
  empty: string;
};

const ALL_USERS: UserListDateColumn = { header: "Last login", field: "last_login_at", empty: "Never" };

const BY_STATUS: Record<string, UserListDateColumn> = {
  draft: { header: "Registered", field: "created_at", empty: "—" },
  completed: { header: "Profile completed", field: "profile_completed_at", empty: "—" },
  for_assessment: { header: "Submitted", field: "updated_at", empty: "—" },
  for_resubmission: { header: "Returned", field: "updated_at", empty: "—" },
  approved: { header: "Approved", field: "approved_at", empty: "—" },
  suspended: { header: "Suspended", field: "suspended_at", empty: "—" },
};

// The Developer Access menu filters on ?type=developer with no status, so the
// type is the second key: a status view wins when both are set (the axes are
// orthogonal and the status is the more specific question).
export function listDateColumn(status: string, accountType = ""): UserListDateColumn {
  const byStatus = BY_STATUS[status];
  if (byStatus) return byStatus;
  if (accountType === "developer") {
    return { header: "Approved", field: "approved_at", empty: "—" };
  }
  return ALL_USERS;
}
