// The list shows ONE timestamp column, chosen by the selected status view:
// the all-users view answers "when were they last here", and each status view
// answers "when did they land there". Values render as the API's own
// Y-m-d H:i:s strings, so the field name is all the column needs.
export type UserListDateColumn = {
  header: string;
  field: "last_login_at" | "created_at" | "profile_completed_at";
  empty: string;
};

const ALL_USERS: UserListDateColumn = { header: "Last login", field: "last_login_at", empty: "Never" };

const BY_STATUS: Record<string, UserListDateColumn> = {
  draft: { header: "Registered", field: "created_at", empty: "—" },
  completed: { header: "Profile completed", field: "profile_completed_at", empty: "—" },
};

export function listDateColumn(status: string): UserListDateColumn {
  return BY_STATUS[status] ?? ALL_USERS;
}
