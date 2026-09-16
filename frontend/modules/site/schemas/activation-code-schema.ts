import { z } from "zod";

// The 8-digit code shown beside the admin activation QR (User API's
// POST /activate `activation_code` field). It may start with a zero, so the
// value is always kept — and sent — as a string, never coerced to a number.
export const activationCodeSchema = z.object({
  activation_code: z
    .string()
    .min(8, "Enter the 8-digit activation code")
    .max(8, "Enter the 8-digit activation code")
    .regex(/^\d{8}$/, "The activation code must be 8 digits"),
});
export type ActivationCodeValues = z.infer<typeof activationCodeSchema>;
