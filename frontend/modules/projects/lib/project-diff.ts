import type { ProjectSnapshot } from "@/types/project";

// What an assessor actually needs to know when a published project comes back
// for review: which fields differ from what's live. Comparing the two panes
// by eye is how a one-word tagline edit gets published as if it were a
// rewrite — or missed entirely.

export type ProjectDiffField =
  | "name"
  | "tagline"
  | "description"
  | "photo"
  | "video_url"
  | "project_url"
  | "repository_url"
  | "tech_stack"
  | "egov_apis_used"
  | "meta";

export const PROJECT_FIELD_LABELS: Record<ProjectDiffField, string> = {
  name: "Name",
  tagline: "Tagline",
  description: "Description",
  photo: "Cover photo",
  video_url: "Demo video",
  project_url: "Live project link",
  repository_url: "Repository link",
  tech_stack: "Tech stack",
  egov_apis_used: "eGov APIs used",
  meta: "Team credit",
};

// Arrays are compared as ordered lists: the API preserves the order they were
// submitted in, and a reordered tech stack is a real (if cosmetic) change to
// what the public page shows.
function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// `meta` is free-form, so it's compared as canonical JSON with its keys
// sorted — two bags with the same content in a different key order aren't a
// change worth flagging.
function stableJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// The fields where the working copy differs from the live snapshot. An empty
// array means the two are identical — publishing again would change nothing.
export function diffProjectSnapshot(
  working: ProjectSnapshot,
  snapshot: ProjectSnapshot,
): ProjectDiffField[] {
  const changed: ProjectDiffField[] = [];

  if (working.name !== snapshot.name) changed.push("name");
  if ((working.tagline ?? "") !== (snapshot.tagline ?? "")) changed.push("tagline");
  if (working.description !== snapshot.description) changed.push("description");
  // Compared by uuid, not URL: a private photo's signed URL is regenerated on
  // every read, so comparing URLs would report a change on every single load.
  if ((working.photo?.uuid ?? null) !== (snapshot.photo?.uuid ?? null)) changed.push("photo");
  if (working.video_url !== snapshot.video_url) changed.push("video_url");
  if (working.project_url !== snapshot.project_url) changed.push("project_url");
  if ((working.repository_url ?? "") !== (snapshot.repository_url ?? "")) {
    changed.push("repository_url");
  }
  if (!sameList(working.tech_stack, snapshot.tech_stack)) changed.push("tech_stack");
  if (!sameList(working.egov_apis_used, snapshot.egov_apis_used)) changed.push("egov_apis_used");
  if (stableJson(working.meta) !== stableJson(snapshot.meta)) changed.push("meta");

  return changed;
}

// The display text for one snapshot field in a Before/After diff row, or
// null when the side has no value. Only the short fields come through here —
// description renders as markdown and the photo as thumbnails, both handled
// by the diff view itself.
export function diffDisplayValue(
  side: ProjectSnapshot,
  field: Exclude<ProjectDiffField, "description" | "photo">,
): string | null {
  switch (field) {
    case "tech_stack":
    case "egov_apis_used": {
      const list = side[field];
      return list.length > 0 ? list.join(" · ") : null;
    }
    case "meta":
      return side.meta === null || side.meta === undefined ? null : JSON.stringify(side.meta);
    default:
      return side[field] ?? null;
  }
}
