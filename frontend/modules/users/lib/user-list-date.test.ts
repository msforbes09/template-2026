import { describe, expect, it } from "vitest";
import { listDateColumn } from "@/modules/users/lib/user-list-date";

// One timestamp column per view, matching what the selected status menu is
// about: the all-users view shows the last login; each status view shows the
// date that put the account there.
describe("listDateColumn", () => {
  it("shows last login on the all-users view", () => {
    expect(listDateColumn("")).toEqual({
      header: "Last login",
      field: "last_login_at",
      empty: "Never",
    });
  });

  it("shows the date that defines each status view", () => {
    expect(listDateColumn("draft")).toEqual({ header: "Registered", field: "created_at", empty: "—" });
    expect(listDateColumn("completed")).toEqual({
      header: "Profile completed",
      field: "profile_completed_at",
      empty: "—",
    });
    expect(listDateColumn("for_assessment")).toEqual({
      header: "Submitted",
      field: "updated_at",
      empty: "—",
    });
    expect(listDateColumn("for_resubmission")).toEqual({
      header: "Returned",
      field: "updated_at",
      empty: "—",
    });
    expect(listDateColumn("approved")).toEqual({ header: "Approved", field: "approved_at", empty: "—" });
    expect(listDateColumn("suspended")).toEqual({
      header: "Suspended",
      field: "suspended_at",
      empty: "—",
    });
  });

  it("falls back to last login for an unknown status", () => {
    expect(listDateColumn("pending")).toEqual({
      header: "Last login",
      field: "last_login_at",
      empty: "Never",
    });
  });

  it("shows the approval date on the Developer Access view (type, not status)", () => {
    expect(listDateColumn("", "developer")).toEqual({
      header: "Approved",
      field: "approved_at",
      empty: "—",
    });
    // A status view wins over the type filter; type=basic changes nothing.
    expect(listDateColumn("suspended", "developer")).toEqual({
      header: "Suspended",
      field: "suspended_at",
      empty: "—",
    });
    expect(listDateColumn("", "basic")).toEqual({
      header: "Last login",
      field: "last_login_at",
      empty: "Never",
    });
  });
});
