import { describe, expect, it } from "vitest";
import { deleteProjectSchema } from "@/modules/projects/schemas/delete-project-schema";

// The password is the re-authentication for a delete the owner cannot undo.
// Presence is all this checks — whether it is CORRECT is the API's answer
// (422 on `password`, from DeleteProjectRequest).
describe("deleteProjectSchema", () => {
  it("requires a password", () => {
    const result = deleteProjectSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter your password to confirm");
  });

  it("accepts one", () => {
    expect(deleteProjectSchema.safeParse({ password: "Secret@123" }).success).toBe(true);
  });

  // A password is not trimmed — leading/trailing spaces are part of it, and
  // silently stripping them would make a correct password fail.
  it("keeps surrounding whitespace intact", () => {
    const result = deleteProjectSchema.safeParse({ password: " pad ded " });
    expect(result.success).toBe(true);
    expect(result.data?.password).toBe(" pad ded ");
  });
});
