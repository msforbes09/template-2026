import { describe, expect, it } from "vitest";
import { listDateColumn } from "@/modules/users/lib/user-list-date";

// One timestamp column per view: the all-users view shows the last login;
// each status view shows the date that put the account there.
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
  });

  it("falls back to last login for an unknown status", () => {
    expect(listDateColumn("suspended")).toEqual({
      header: "Last login",
      field: "last_login_at",
      empty: "Never",
    });
  });

  it("takes one argument only", () => {
    expect(listDateColumn.length).toBe(1);
  });
});
