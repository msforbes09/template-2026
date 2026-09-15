import { z } from "zod";

export const resetPasswordSchema = z
  .object({
    otp: z
      .string()
      .min(6, "Enter the 6-digit code")
      .max(6, "Enter the 6-digit code")
      .regex(/^\d{6}$/, "The code must be 6 digits"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    new_password_confirmation: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: "Passwords do not match",
    path: ["new_password_confirmation"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
