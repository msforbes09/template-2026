import { z } from "zod";

export const administratorSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  // UUID of a file uploaded via the private uploader (POST /common/files/private).
  // Every administrator always has one (required by the API on create); an
  // edit submission that doesn't replace the photo just resends the existing uuid.
  photo_uuid: z.string().min(1, "Photo is required"),
});

export type AdministratorValues = z.infer<typeof administratorSchema>;
