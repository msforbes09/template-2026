import { describe, expect, test } from "vitest";
import { assessorName } from "@/modules/users/lib/assessor-name";

// The Admin API declares assessor objects as a bare `object` (no property
// schema), so the shape is read defensively — see types/admin-user.ts.
describe("assessorName", () => {
  test("joins first and last name", () => {
    expect(assessorName({ first_name: "Maria", last_name: "Santos" })).toBe("Maria Santos");
  });

  test("falls back to email when names are missing", () => {
    expect(assessorName({ email: "admin@egov.ph" })).toBe("admin@egov.ph");
  });

  test("null for a null or shapeless assessor", () => {
    expect(assessorName(null)).toBeNull();
    expect(assessorName({ id: 7 })).toBeNull();
  });
});
