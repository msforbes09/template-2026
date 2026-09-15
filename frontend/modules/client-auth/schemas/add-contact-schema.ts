import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The +63 country code is a fixed prefix in the UI — this only validates the
// 10 digits typed after it (local mobile numbers are 9XXXXXXXXX; adjust to the backend's rule).
const PH_MOBILE_REGEX = /^9\d{9}$/;

export const addContactEmailSchema = z.object({
  email: z.string().trim().regex(EMAIL_REGEX, "Enter a valid email address"),
});
export type AddContactEmailValues = z.infer<typeof addContactEmailSchema>;

export const addContactMobileSchema = z.object({
  mobile_number: z.string().trim().regex(PH_MOBILE_REGEX, "Enter a valid mobile number"),
});
export type AddContactMobileValues = z.infer<typeof addContactMobileSchema>;
