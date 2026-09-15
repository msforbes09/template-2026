import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerSchema = z.object({
  email: z.string().trim().regex(EMAIL_REGEX, "Enter a valid email address"),
  company_name: z.string().min(1, "Company name is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
});
export type RegisterValues = z.infer<typeof registerSchema>;
