import { z } from "zod";
import { isYouTubeUrl } from "@/modules/projects/lib/youtube";

// Mirrors the API's ProjectInput (identical for the citizen and admin create/
// update endpoints), so a submission fails in the form rather than round-
// tripping to a 422. Limits are the backend's: name 150, tagline 160,
// description 20,000, tech_stack/egov_apis_used 1–30 items.

const MAX_DESCRIPTION = 20_000;

// Both URL fields must be https — the API rejects anything else, and a
// plain-http demo link on a government showcase page is its own problem.
const httpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => {
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: `Enter a valid https ${label}` },
    );

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(150, "Keep the name under 150 characters"),
  // Optional one-liner used as the card subtitle everywhere the project is
  // listed, so it's worth prompting for even though the API allows null.
  tagline: z.string().trim().max(160, "Keep the tagline under 160 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(MAX_DESCRIPTION, `Keep the description under ${MAX_DESCRIPTION.toLocaleString()} characters`),
  // Set by the uploader after POST common/files/private; "" means no photo,
  // which the API accepts (photo_uuid is nullable).
  photo_uuid: z.string(),
  video_url: z
    .string()
    .trim()
    .min(1, "A demo video is required")
    .refine(isYouTubeUrl, {
      message: "Enter an https YouTube link (youtube.com or youtu.be)",
    }),
  project_url: httpsUrl("link to the live project"),
  repository_url: httpsUrl("repository link").or(z.literal("")),
  tech_stack: z
    .array(z.string().trim().min(1).max(50, "Each entry must be under 50 characters"))
    .min(1, "Add at least one technology")
    .max(30, "Add no more than 30 technologies"),
  egov_apis_used: z
    .array(z.string())
    .min(1, "Select at least one eGov API")
    .max(30, "Select no more than 30 eGov APIs"),
  // The programme this project is entered into. Optional, and accepted by the
  // API on CREATE only — a citizen cannot move or clear their own project's
  // event afterwards, so the edit form doesn't offer it. "" means none.
  egov_event_id: z.string(),
  // `meta` is free-form on the API. The form exposes the shape the handoff
  // prescribes — team name and member names — because the public page shows
  // no account identity, making this the only place credit can appear.
  team_name: z.string().trim().max(150, "Keep the team name under 150 characters"),
  team_members: z.array(z.string().trim().min(1).max(150)).max(30, "Add no more than 30 members"),
});

export type ProjectValues = z.infer<typeof projectSchema>;

// The RHF field names that map 1:1 to an API field, for applyResultErrors.
// `meta` has no input of its own — a validation error on it folds into the
// form's root message.
export const PROJECT_FIELDS = [
  "name",
  "tagline",
  "description",
  "photo_uuid",
  "video_url",
  "project_url",
  "repository_url",
  "tech_stack",
  "egov_apis_used",
  "egov_event_id",
] as const;

// Laravel reports array errors per index (`tech_stack.0`, `egov_apis_used.2`).
// Those keys have no matching RHF field, so they'd fold into the root message
// unchanged and read as gibberish to the user; this rewrites them onto the
// array field itself, keeping the backend's message.
export function normalizeProjectErrors(
  errors: Record<string, string[]>,
): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(errors)) {
    const base = field.replace(/\.\d+$/, "");
    normalized[base] = [...(normalized[base] ?? []), ...messages];
  }
  return normalized;
}

// A blank form. Every array/string field is present so RHF starts controlled
// (an undefined default would make the markdown editor and list inputs flip
// from uncontrolled to controlled on first edit).
export const EMPTY_PROJECT_VALUES: ProjectValues = {
  egov_event_id: "",
  name: "",
  tagline: "",
  description: "",
  photo_uuid: "",
  video_url: "",
  project_url: "",
  repository_url: "",
  tech_stack: [],
  egov_apis_used: [],
  team_name: "",
  team_members: [],
};
