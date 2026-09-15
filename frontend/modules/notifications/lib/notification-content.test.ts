import { describe, it, expect } from "vitest";
import {
  notificationContent,
  referenceHref,
} from "@/modules/notifications/lib/notification-content";
import type { AppNotification, NotificationData } from "@/types/notification";

function notification(
  type: string,
  data: Partial<NotificationData> = {},
  text: { title?: string; message?: string | null } = {},
): AppNotification {
  return {
    id: 1,
    type,
    title: text.title ?? "Server headline",
    message: text.message ?? null,
    // `reference` is present on every payload the backend sends; default it
    // to null so each test only states the part it cares about.
    data: { reference: null, ...data } as NotificationData,
    read_at: null,
    created_at: "2026-08-27 14:05:11",
  };
}

describe("referenceHref", () => {
  it("routes the two reference types the backend sends", () => {
    expect(referenceHref({ type: "project", uuid: "9d3f" })).toBe("/projects/9d3f");
    expect(referenceHref({ type: "api_catalog", identifier: "everify" })).toBe(
      "/dashboard/api-catalogs/everify",
    );
  });

  it("returns null for no reference", () => {
    expect(referenceHref(null)).toBeNull();
  });

  it("returns null for a reference type this build has never heard of", () => {
    // A guessed URL is worse than no link.
    expect(
      referenceHref({ type: "invoice", id: 7 } as unknown as Parameters<typeof referenceHref>[0]),
    ).toBeNull();
  });
});

describe("notificationContent — server-rendered text", () => {
  it("renders the payload's title and message verbatim", () => {
    // The backend owns the copy since the 2026-08-28 contract change; the
    // frontend must not rebuild it from `data`.
    const content = notificationContent(
      notification(
        "review.created",
        { project_name: "Barangay Konek", rating: 5 },
        { title: "Maria Santos reviewed Barangay Konek", message: "They rated it 5 out of 5 stars." },
      ),
    );
    expect(content.title).toBe("Maria Santos reviewed Barangay Konek");
    expect(content.body).toBe("They rated it 5 out of 5 stars.");
  });

  it("renders no second line when message is null", () => {
    const content = notificationContent(
      notification("welcome.back", {}, { title: "Welcome back", message: null }),
    );
    expect(content.body).toBeNull();
  });

  it("renders an unknown type with its server title and the default presentation", () => {
    // The backend guarantees a sensible title even for types this build has
    // never heard of, so nothing needs a raw-type fallback any more.
    const content = notificationContent(
      notification("billing.invoice_ready", {}, { title: "You have a new notification" }),
    );
    expect(content.title).toBe("You have a new notification");
    expect(content.tone).toBe("neutral");
    expect(content.toast).toBe(false);
    expect(content.icon).toBeTruthy();
  });
});

describe("notificationContent — presentation stays keyed by type", () => {
  it("keeps sanctions critical and security marked as security", () => {
    expect(notificationContent(notification("sanction.suspended")).tone).toBe("critical");
    expect(notificationContent(notification("sanction.demoted")).tone).toBe("critical");
    expect(notificationContent(notification("credits.exhausted")).tone).toBe("critical");
    expect(notificationContent(notification("security.password_changed")).tone).toBe("security");
    expect(notificationContent(notification("security.account_recovered")).tone).toBe("security");
  });

  it("presents the visibility pair by direction", () => {
    expect(notificationContent(notification("project.hidden")).tone).toBe("warning");
    expect(notificationContent(notification("project.unhidden")).tone).toBe("positive");
    expect(notificationContent(notification("project.hidden")).toast).toBe(false);
  });

  it("gives project.submitted the received-application presentation", () => {
    const content = notificationContent(notification("project.submitted"));
    expect(content.tone).toBe("neutral");
    expect(content.toast).toBe(false);
  });

  it("marks a changed rating as worth attention", () => {
    const content = notificationContent(notification("review.updated"));
    expect(content.tone).toBe("neutral");
    expect(content.toast).toBe(false);
  });

  it("keeps good news positive and warnings warning", () => {
    expect(notificationContent(notification("application.approved")).tone).toBe("positive");
    expect(notificationContent(notification("profile.completed")).tone).toBe("positive");
    expect(notificationContent(notification("project.published")).tone).toBe("positive");
    expect(notificationContent(notification("project.sent_back")).tone).toBe("warning");
    expect(notificationContent(notification("credits.low")).tone).toBe("warning");
    expect(notificationContent(notification("credits.topped_up")).tone).toBe("positive");
  });

  it("toasts only the delightful types, never sanctions or security", () => {
    const toasts = [
      "application.approved",
      "project.published",
      "project.tagged",
      "welcome",
      "sanction.suspended",
      "sanction.demoted",
      "security.password_changed",
      "credits.exhausted",
      "announcement",
    ].map((type) => [type, notificationContent(notification(type)).toast]);

    expect(toasts).toEqual([
      ["application.approved", true],
      ["project.published", true],
      ["project.tagged", true],
      ["welcome", false],
      ["sanction.suspended", false],
      ["sanction.demoted", false],
      ["security.password_changed", false],
      ["credits.exhausted", false],
      ["announcement", false],
    ]);
  });
});

describe("notificationContent — routing", () => {
  it("prefers the reference over the type's fallback", () => {
    const content = notificationContent(
      notification("project.published", {
        reference: { type: "project", uuid: "abc" },
      }),
    );
    expect(content.href).toBe("/projects/abc");
  });

  it("routes owner-facing project types to the manage page", () => {
    // review.created reaches the project's OWNER; submitted and sent_back
    // describe a project that is not public yet, so the public show would
    // 404. All three land where the owner manages the project.
    const ref = { reference: { type: "project", uuid: "abc" } as const };
    expect(notificationContent(notification("review.created", ref)).href).toBe(
      "/dashboard/projects/abc",
    );
    expect(notificationContent(notification("project.submitted", ref)).href).toBe(
      "/dashboard/projects/abc",
    );
    expect(notificationContent(notification("project.sent_back", ref)).href).toBe(
      "/dashboard/projects/abc",
    );
    // A changed rating reaches the owner too.
    expect(notificationContent(notification("review.updated", ref)).href).toBe(
      "/dashboard/projects/abc",
    );
    // Tagging can land on an UNPUBLISHED project, and hiding by definition
    // leaves no public page — both go to the manage side.
    expect(notificationContent(notification("project.tagged", ref)).href).toBe(
      "/dashboard/projects/abc",
    );
    expect(notificationContent(notification("project.hidden", ref)).href).toBe(
      "/dashboard/projects/abc",
    );
    // Back on the showcase — the public page is live again.
    expect(notificationContent(notification("project.unhidden", ref)).href).toBe("/projects/abc");
    // The reviewer is a VISITOR to the project, so replies stay public…
    expect(notificationContent(notification("review.replied", ref)).href).toBe("/projects/abc");
    // …but the OWNER variant (the reviewer replied in their own thread,
    // for_owner in the payload) lands on the owner's manage page.
    expect(
      notificationContent(notification("review.replied", { ...ref, for_owner: 1 })).href,
    ).toBe("/dashboard/projects/abc");
  });

  it("falls back to the type's destination when the reference is null", () => {
    expect(notificationContent(notification("welcome")).href).toBe("/dashboard");
    // profile.completed announces that browsing/reviewing projects unlocked,
    // so it lands on the public showcase.
    expect(notificationContent(notification("profile.completed")).href).toBe("/projects");
    // The whole application lifecycle lands on the dashboard — it is where
    // the application status, remarks and resubmit control all live.
    expect(notificationContent(notification("application.received")).href).toBe("/dashboard");
    expect(notificationContent(notification("application.approved")).href).toBe("/dashboard");
    expect(notificationContent(notification("application.returned")).href).toBe("/dashboard");
    // Sanctions and security events too — the dashboard is the account's
    // home and shows its current state.
    expect(notificationContent(notification("sanction.suspended")).href).toBe("/dashboard");
    expect(notificationContent(notification("sanction.unsuspended")).href).toBe("/dashboard");
    expect(notificationContent(notification("sanction.demoted")).href).toBe("/dashboard");
    expect(notificationContent(notification("security.password_changed")).href).toBe("/dashboard");
    expect(notificationContent(notification("security.account_recovered")).href).toBe("/dashboard");
    expect(notificationContent(notification("project.deleted")).href).toBe(
      "/dashboard/projects",
    );
  });

  it("has no link for a type with neither", () => {
    // announcement carries a null reference by design and has no page.
    expect(
      notificationContent(notification("announcement", {}, { title: "Maintenance" })).href,
    ).toBeNull();
  });

  it("routes a credits notification at its own catalog's usage tab", () => {
    // Straight to the meter the alert is about, not the documentation tab.
    const ref = { reference: { type: "api_catalog", identifier: "everify" } as const };
    expect(notificationContent(notification("credits.low", ref)).href).toBe(
      "/dashboard/api-catalogs/everify?tab=usage",
    );
    expect(notificationContent(notification("credits.exhausted", ref)).href).toBe(
      "/dashboard/api-catalogs/everify?tab=usage",
    );
    expect(notificationContent(notification("credits.topped_up", ref)).href).toBe(
      "/dashboard/api-catalogs/everify?tab=usage",
    );
    // Other catalog-referencing types keep the default (documentation) tab.
    expect(notificationContent(notification("some.future_type", ref)).href).toBe(
      "/dashboard/api-catalogs/everify",
    );
  });
});
