import { z } from "zod";

export const verifyContactSchema = z.object({
  otp: z
    .string()
    .min(6, "Enter the 6-digit code")
    .max(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "The code must be 6 digits"),
});
export type VerifyContactValues = z.infer<typeof verifyContactSchema>;
