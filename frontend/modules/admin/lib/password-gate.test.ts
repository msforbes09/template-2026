import { describe, expect, it } from "vitest";
import { passwordGateReason } from "@/modules/admin/lib/password-gate";
import type { Administrator } from "@/types/administrator";

function profile(overrides: Partial<Administrator> = {}): Administrator {
  return {
    id: 1,
    email: "sam@example.com",
    first_name: "Sam",
    last_name: "Admin",
    photo: null,
    is_active: 1,
    with_temporary_password: 0,
    last_login_at: null,
    auth_validated: null,
    created_at: null,
    updated_at: null,
    password_changed_at: "2026-06-01 09:00:00",
    password_expires_at: "2026-08-30 09:00:00",
    is_password_expired: 0,
    password_expiry_waives_remaining: 3,
    roles: [],
    ...overrides,
  };
}

describe("passwordGateReason", () => {
  it("is null without a profile or when nothing forces a change", () => {
    expect(passwordGateReason(null)).toBeNull();
    expect(passwordGateReason(profile())).toBeNull();
  });

  it("forces a change for a temporary password", () => {
    expect(passwordGateReason(profile({ with_temporary_password: 1 }))).toBe("temporary");
  });

  it("forces a change once an expired password has no postponements left", () => {
    expect(
      passwordGateReason(profile({ is_password_expired: 1, password_expiry_waives_remaining: 0 })),
    ).toBe("expired");
  });

  it("does not force a change while postponements remain", () => {
    expect(
      passwordGateReason(profile({ is_password_expired: 1, password_expiry_waives_remaining: 1 })),
    ).toBeNull();
  });

  it("names the temporary password first when both apply", () => {
    expect(
      passwordGateReason(
        profile({ with_temporary_password: 1, is_password_expired: 1, password_expiry_waives_remaining: 0 }),
      ),
    ).toBe("temporary");
  });
});
