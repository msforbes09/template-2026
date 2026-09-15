import { z } from "zod";

// Only these four fields are updatable per the Admin API contract —
// identifier, spec, and credentials are managed by the backend.
export const apiCatalogSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  body: z.string().optional(),
  meta: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      try {
        const parsed: unknown = JSON.parse(value);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }, "Must be a valid JSON object, e.g. { \"format\": \"openapi\" }"),
});

export type ApiCatalogValues = z.infer<typeof apiCatalogSchema>;
