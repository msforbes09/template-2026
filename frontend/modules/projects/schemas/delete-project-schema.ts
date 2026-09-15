import { z } from "zod";

// Deleting a project takes the account password — the same re-authentication
// account deletion uses. The backend is the one that enforces it
// (DeleteProjectRequest, `current_password:users`); this only stops an empty
// submit from making a pointless round-trip, so presence is the whole rule.
//
// Deliberately not trimmed: surrounding spaces can be part of a password, and
// stripping them would turn a correct one into a 422 nobody could explain.
export const deleteProjectSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm"),
});

export type DeleteProjectValues = z.infer<typeof deleteProjectSchema>;
