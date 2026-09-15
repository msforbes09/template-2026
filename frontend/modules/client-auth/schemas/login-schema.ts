import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The +63 country code is a fixed prefix in the UI — this only validates the
// 10 digits typed after it (local mobile numbers are 9XXXXXXXXX; adjust to the backend's rule).
const PH_MOBILE_REGEX = /^9\d{9}$/;

export const loginSchema = z
  .object({
    channel: z.enum(["email", "sms"]),
    email: z.string().trim(),
    mobile_number: z.string().trim(),
    password: z.string().min(1, "Password is required"),
  })
  .refine((data) => data.channel !== "email" || EMAIL_REGEX.test(data.email), {
    message: "Enter a valid email address",
    path: ["email"],
  })
  .refine((data) => data.channel !== "sms" || PH_MOBILE_REGEX.test(data.mobile_number), {
    message: "Enter a valid mobile number",
    path: ["mobile_number"],
  });
export type LoginValues = z.infer<typeof loginSchema>;

export const twoFactorSchema = z.object({
  pin: z
    .string()
    .min(6, "Enter the 6-digit code")
    .max(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "The code must be 6 digits"),
});
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;
