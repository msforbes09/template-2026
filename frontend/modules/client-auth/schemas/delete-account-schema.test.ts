import { describe, expect, it } from "vitest";
import { deleteAccountSchema } from "@/modules/client-auth/schemas/delete-account-schema";

// The password field is the re-authentication for an irreversible action, so
// the only thing worth pinning here is that an empty one can never reach the
// endpoint — whether it's CORRECT is the backend's call, and comes back as a
// 422 on this same field.
describe("deleteAccountSchema", () => {
  it("accepts a password", () => {
    const result = deleteAccountSchema.safeParse({ password: "Secret@123" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password with a message on the field", () => {
    const result = deleteAccountSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password?.[0]).toBe(
        "Enter your password to confirm",
      );
    }
  });

  it("rejects a missing password", () => {
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
  });

  it("does not trim or otherwise rewrite the password", () => {
    // A password may legitimately begin or end with a space; silently trimming
    // it here would send something the user never typed and produce a 422 they
    // cannot explain.
    const padded = " has spaces ";
    const result = deleteAccountSchema.safeParse({ password: padded });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.password).toBe(padded);
  });
});
