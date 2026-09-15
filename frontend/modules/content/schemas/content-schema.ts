import { z } from "zod";

export const contentSchema = z.object({
  identifier: z
    .string()
    .min(1, "Identifier is required")
    .regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, dashes, and underscores only"),
  title: z.string().optional(),
  body: z.string().min(1, "Body is required"),
});

export type ContentValues = z.infer<typeof contentSchema>;
