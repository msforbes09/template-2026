import { z } from "zod";

// RHF/native inputs always produce strings (never undefined/null), so every
// optional field is typed as a string in the form and transformed to null
// for the empty case right before it's sent as PUT /profile's body — that
// endpoint's contract wants these fields nullable, not omitted.
const nullableString = z.string().transform((value) => (value.trim() === "" ? null : value));

export const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  middle_name: nullableString,
  suffix_name: nullableString,
  company_name: z.string().min(1, "Company name is required"),
  birth_date: z.string().min(1, "Birth date is required"),
  gender: z
    .enum(["male", "female", ""])
    .refine((value) => value !== "", { message: "Gender is required" })
    .transform((value) => value as "male" | "female"),
  citizenship_code: z.string().min(1, "Citizenship is required"),
  region_code: z.string().min(1, "Region is required"),
  province_code: nullableString,
  municipality_code: z.string().min(1, "City/Municipality is required"),
  barangay_code: z.string().min(1, "Barangay is required"),
  address_line_one: z.string().min(1, "Address is required"),
  address_line_two: nullableString,
  postal_code: z.string().min(1, "Postal code is required"),
  photo_uuid: nullableString,
});
export type ProfileFormValues = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;
