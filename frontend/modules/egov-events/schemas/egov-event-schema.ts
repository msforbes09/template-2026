import { z } from "zod";

// Mirrors EgovEventInput. `slug` is deliberately absent: it is generated from
// the name, regenerated whenever the name changes, and a supplied value is
// ignored — so offering a field for it would be a lie.
//
// Datetimes are the API's `Y-m-d H:i:s`, never ISO-8601.
const DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const datetimeField = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || DATETIME.test(value), {
      message: `Enter ${label} as YYYY-MM-DD HH:MM:SS`,
    });

// One curation label. Mirrors the backend's per-entry rules exactly, so an
// obviously-wrong value is caught here rather than coming back as a 422 on
// `custom_tags.<i>.<field>` after a round trip.
//
// `icon` is a lucide-style slug — lowercase letters and digits, single hyphens
// between them, no leading or trailing hyphen. That is the backend's rule, and
// it is also what tagIcon can resolve.
const ICON_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const customTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Keep the name under 50 characters"),
  color: z
    .string()
    .trim()
    .regex(HEX_COLOR, "Enter a 6-digit hex colour, e.g. #F59E0B"),
  icon: z
    .string()
    .trim()
    .max(50, "Keep the icon slug under 50 characters")
    .regex(ICON_SLUG, "Use a lucide slug, e.g. trophy or bar-chart-3"),
});

export type CustomTagValues = z.infer<typeof customTagSchema>;

export const EMPTY_CUSTOM_TAG: CustomTagValues = {
  name: "",
  color: "#F59E0B",
  icon: "trophy",
};

export const MAX_CUSTOM_TAGS = 20;

export const egovEventSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(150, "Keep the name under 150 characters"),
    description: z.string().trim().max(2000, "Keep the description under 2,000 characters"),
    is_active: z.boolean(),
    is_published: z.boolean(),
    starts_at: datetimeField("the start"),
    ends_at: datetimeField("the end"),
    // Required (2026-09-02): the cover is the event's masthead in the console
    // and on the public showcase, so an event may not be saved without one.
    // The API enforces the same rule.
    photo_uuid: z.string().min(1, "Cover photo is required"),
    // Free-form public extras (venue, prizes, links), edited as JSON because
    // the shape is genuinely open.
    meta: z.string(),
    // This event's curation labels. Order is meaningful — it is the order the
    // public tabs render in — so this is a list the admin reorders, not a set.
    custom_tags: z.array(customTagSchema).max(MAX_CUSTOM_TAGS, `At most ${MAX_CUSTOM_TAGS} tags`),
  })
  .refine(
    (values) => {
      // The backend collapses duplicates to the first occurrence rather than
      // rejecting them, which would silently drop a row the admin typed. Say
      // so instead.
      const names = values.custom_tags.map((tag) => tag.name.trim().toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: "Two tags share a name", path: ["custom_tags"] },
  )
  .refine(
    (values) => {
      if (!values.starts_at || !values.ends_at) return true;
      // Both are zero-padded `Y-m-d H:i:s`, so string order is chronological.
      return values.ends_at >= values.starts_at;
    },
    { message: "The end cannot be before the start", path: ["ends_at"] },
  )
  .refine(
    (values) => {
      if (!values.meta.trim()) return true;
      try {
        const parsed: unknown = JSON.parse(values.meta);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
      } catch {
        return false;
      }
    },
    { message: "Enter a JSON object, e.g. {\"venue\": \"PICC\"}", path: ["meta"] },
  );

export type EgovEventValues = z.infer<typeof egovEventSchema>;

export const EMPTY_EVENT_VALUES: EgovEventValues = {
  name: "",
  description: "",
  is_active: true,
  // Public by default, matching the backend column default. Hiding an
  // event is the deliberate act, not publishing one.
  is_published: true,
  starts_at: "",
  ends_at: "",
  photo_uuid: "",
  meta: "",
  custom_tags: [],
};

export const EGOV_EVENT_FIELDS = [
  "name",
  "description",
  "is_active",
  "is_published",
  "starts_at",
  "ends_at",
  "photo_uuid",
  "meta",
  "custom_tags",
] as const;
