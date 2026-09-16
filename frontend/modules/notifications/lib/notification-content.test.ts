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
  it("returns null for no reference", () => {
    expect(referenceHref(null)).toBeNull();
  });

  it("returns null for a reference type this build has never heard of", () => {
    // A guessed URL is worse than no link. No reference type is routed in
    // the template; a project adds its own branches here.
    expect(
      referenceHref({ type: "invoice", id: 7 } as unknown as Parameters<typeof referenceHref>[0]),
    ).toBeNull();
  });
});

describe("notificationContent — server-rendered text", () => {
  it("renders the payload's title and message verbatim", () => {
    // The backend owns the copy; the frontend must not rebuild it from `data`.
    const content = notificationContent(
      notification(
        "profile.completed",
        {},
        { title: "Your profile is complete", message: "Thanks for filling everything in." },
      ),
    );
    expect(content.title).toBe("Your profile is complete");
    expect(content.body).toBe("Thanks for filling everything in.");
  });

  it("renders no second line when message is null", () => {
    const content = notificationContent(
      notification("welcome.back", {}, { title: "Welcome back", message: null }),
    );
    expect(content.body).toBeNull();
  });

  it("renders an unknown type with its server title and the default presentation", () => {
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
  it("marks security events as security", () => {
    expect(notificationContent(notification("security.password_changed")).tone).toBe("security");
    expect(notificationContent(notification("security.account_recovered")).tone).toBe("security");
  });

  it("keeps good news positive", () => {
    expect(notificationContent(notification("welcome")).tone).toBe("positive");
    expect(notificationContent(notification("profile.completed")).tone).toBe("positive");
  });

  it("never toasts security or announcements", () => {
    const toasts = [
      "welcome",
      "profile.completed",
      "security.password_changed",
      "security.account_recovered",
      "announcement",
    ].map((type) => [type, notificationContent(notification(type)).toast]);

    expect(toasts).toEqual([
      ["welcome", false],
      ["profile.completed", false],
      ["security.password_changed", false],
      ["security.account_recovered", false],
      ["announcement", false],
    ]);
  });

  it("presents a removed type with the fallback rather than a stale entry", () => {
    // The template keeps only the six types the backend template sends.
    for (const type of ["review.created", "project.published", "sanction.suspended", "credits.low"]) {
      const content = notificationContent(notification(type));
      expect(content.tone).toBe("neutral");
      expect(content.toast).toBe(false);
    }
  });
});

describe("notificationContent — routing", () => {
  it("falls back to the type's destination when the reference is null", () => {
    expect(notificationContent(notification("welcome")).href).toBe("/dashboard");
    expect(notificationContent(notification("welcome.back")).href).toBe("/dashboard");
    expect(notificationContent(notification("profile.completed")).href).toBe("/dashboard/profile");
    expect(notificationContent(notification("security.password_changed")).href).toBe("/dashboard");
    expect(notificationContent(notification("security.account_recovered")).href).toBe("/dashboard");
  });

  it("has no link for a type with neither", () => {
    // announcement carries a null reference by design and has no page.
    expect(
      notificationContent(notification("announcement", {}, { title: "Maintenance" })).href,
    ).toBeNull();
  });

  it("has no link for a removed type", () => {
    expect(notificationContent(notification("project.deleted")).href).toBeNull();
  });
});
