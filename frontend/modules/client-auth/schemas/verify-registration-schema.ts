import { z } from "zod";

export const verifyRegistrationSchema = z
  .object({
    otp: z
      .string()
      .min(6, "Enter the 6-digit code")
      .max(6, "Enter the 6-digit code")
      .regex(/^\d{6}$/, "The code must be 6 digits"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });
export type VerifyRegistrationValues = z.infer<typeof verifyRegistrationSchema>;
