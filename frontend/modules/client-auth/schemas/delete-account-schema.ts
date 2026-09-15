import { z } from "zod";

// The password is the re-authentication for a destructive, irreversible action,
// so it is required — the backend rejects the request without it (422). Only
// presence is checked here; whether it is CORRECT is the API's answer, and the
// 422 comes back onto this field.
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm"),
});

export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;
