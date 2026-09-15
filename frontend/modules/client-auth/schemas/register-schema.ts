import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The +63 country code is a fixed prefix in the UI — this only validates the
// 10 digits typed after it (Philippine mobile numbers are 9XXXXXXXXX).
const PH_MOBILE_REGEX = /^9\d{9}$/;

export const registerSchema = z
  .object({
    channel: z.enum(["email", "sms"]),
    email: z.string().trim(),
    mobile_number: z.string().trim(),
    company_name: z.string().min(1, "Company name is required"),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
  })
  .refine((data) => data.channel !== "email" || EMAIL_REGEX.test(data.email), {
    message: "Enter a valid email address",
    path: ["email"],
  })
  .refine((data) => data.channel !== "sms" || PH_MOBILE_REGEX.test(data.mobile_number), {
    message: "Enter a valid mobile number",
    path: ["mobile_number"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;
