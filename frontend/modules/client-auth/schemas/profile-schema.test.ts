import { describe, expect, it } from "vitest";
import { profileSchema } from "@/modules/client-auth/schemas/profile-schema";

const valid = {
  first_name: "Alex",
  last_name: "Rivera",
  middle_name: "",
  suffix_name: "",
  company_name: "Acme",
  birth_date: "1990-01-01",
  gender: "male" as const,
  citizenship_code: "PH",
  region_code: "R1",
  province_code: "",
  municipality_code: "M1",
  barangay_code: "B1",
  address_line_one: "123 Rizal St.",
  address_line_two: "",
  postal_code: "1000",
  photo_uuid: "",
};

// The mobile number is a plain, optional contact field on PUT /profile — no
// verification, nullable when blank, capped at the backend's 20 characters.
describe("profileSchema mobile_number", () => {
  it("passes a trimmed mobile number through", () => {
    const result = profileSchema.safeParse({ ...valid, mobile_number: " +639171234567 " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mobile_number).toBe("+639171234567");
  });

  it("sends null for a blank mobile number", () => {
    const result = profileSchema.safeParse({ ...valid, mobile_number: "  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mobile_number).toBeNull();
  });

  it("rejects a mobile number longer than 20 characters", () => {
    const result = profileSchema.safeParse({ ...valid, mobile_number: "1".repeat(21) });
    expect(result.success).toBe(false);
  });
});
