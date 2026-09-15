import type { Project, ProjectMeta, ProjectSnapshot } from "@/types/project";
import type { ProjectValues } from "@/modules/projects/schemas/project-schema";

// The form works in strings and arrays; the API's ProjectInput wants null for
// "not set" and a free-form `meta` object. These two functions are the only
// place that conversion happens, in both directions, so create/edit/admin all
// agree on it.

export type ProjectInput = {
  egov_event_id?: number | null;
  name: string;
  tagline?: string | null;
  description: string;
  photo_uuid?: string | null;
  video_url: string;
  project_url: string;
  repository_url?: string | null;
  tech_stack: string[];
  egov_apis_used: string[];
  meta?: ProjectMeta;
};

// An empty input is sent as null rather than "" — Laravel's `nullable`
// validation accepts both, but a stored "" would render as an empty link on
// the public page instead of being omitted.
const orNull = (value: string) => (value.trim() ? value.trim() : null);

// The asymmetry between create and update is deliberate, and it is a fix:
//
// - On CREATE, an optional the user left blank is OMITTED. Sending it as
//   `null` makes the endpoint answer 400 `data_processing_failed` — the
//   backend's catch-all for an exception during the write (confirmed against
//   this API; see the 2026-08-18 fix on b/d/chat-assistant-project).
//   "Optional" in the handoff means leave the key out, not send a null the
//   contract never advertised.
// - On UPDATE, the `null` is kept on purpose. The endpoint takes a partial
//   update, where an omitted key means "leave this alone", so null is the
//   only way to CLEAR a tagline, photo or repository link that was set
//   before.
export function toProjectInput(
  values: ProjectValues,
  { partial = false }: { partial?: boolean } = {},
): ProjectInput {
  const members = values.team_members.map((member) => member.trim()).filter(Boolean);
  const team = values.team_name.trim();
  // `meta` is free-form, so only the keys that carry something are sent —
  // an object of empty strings would surface as blank credit on the public
  // detail page.
  const meta: Record<string, unknown> = {};
  if (team) meta.team = team;
  if (members.length) meta.members = members;

  const input: ProjectInput = {
    name: values.name.trim(),
    description: values.description,
    video_url: values.video_url.trim(),
    project_url: values.project_url.trim(),
    tech_stack: values.tech_stack.map((tech) => tech.trim()).filter(Boolean),
    egov_apis_used: values.egov_apis_used,
  };

  const tagline = orNull(values.tagline);
  const photoUuid = orNull(values.photo_uuid);
  const repositoryUrl = orNull(values.repository_url);
  const metaBag = Object.keys(meta).length ? meta : null;

  // On create only a value that exists is sent; on update the null goes too,
  // because that is what clears the field.
  if (partial || tagline !== null) input.tagline = tagline;
  if (partial || photoUuid !== null) input.photo_uuid = photoUuid;
  if (partial || repositoryUrl !== null) input.repository_url = repositoryUrl;
  if (partial || metaBag !== null) input.meta = metaBag;

  // Create only for a citizen: the API ignores egov_event_id on PUT, and
  // sending a value that will be discarded invites the belief it was applied.
  // The admin update path passes it explicitly instead (see withEvent).
  if (!partial && values.egov_event_id) {
    input.egov_event_id = Number(values.egov_event_id);
  }

  return input;
}

// Seeds the edit form. `meta` is free-form on the API, so team/members are
// read defensively — a project created through another client (or by an
// admin who put something else there) must not break the form.
// Admins may move a project between events on update, including to a closed
// one, and may clear it with null. Layered on top rather than folded into
// toProjectInput because the citizen and admin rules genuinely differ.
export function withEvent(input: ProjectInput, eventId: string): ProjectInput {
  return { ...input, egov_event_id: eventId ? Number(eventId) : null };
}

export function toProjectValues(project: Project | ProjectSnapshot): ProjectValues {
  const meta = project.meta ?? {};
  const team = typeof meta.team === "string" ? meta.team : "";
  const members = Array.isArray(meta.members)
    ? meta.members.filter((member): member is string => typeof member === "string")
    : [];

  return {
    // Only meaningful on the admin edit form; the citizen edit form doesn't
    // render the field and the API would ignore it anyway.
    egov_event_id:
      "egov_event" in project && project.egov_event ? String(project.egov_event.id) : "",
    name: project.name,
    tagline: project.tagline ?? "",
    description: project.description,
    photo_uuid: project.photo?.uuid ?? "",
    video_url: project.video_url,
    project_url: project.project_url,
    repository_url: project.repository_url ?? "",
    tech_stack: project.tech_stack,
    egov_apis_used: project.egov_apis_used,
    team_name: team,
    team_members: members,
  };
}

// What the public detail page credits the project to. Same defensive read as
// above, kept here so the public view doesn't reach into `meta` itself.
export function projectCredits(meta: ProjectMeta): { team: string | null; members: string[] } {
  const bag = meta ?? {};
  return {
    team: typeof bag.team === "string" && bag.team.trim() ? bag.team.trim() : null,
    members: Array.isArray(bag.members)
      ? bag.members.filter((member): member is string => typeof member === "string" && !!member.trim())
      : [],
  };
}

// FileUploader wants a full UploadedFile to render its preview, but a project
// only carries `{uuid, url}` for its photo — the rest of the upload response
// isn't stored. This synthesises the missing half so an edit form shows the
// existing photo instead of an empty uploader. `mime_type` is deliberately
// image-ish: the uploader keys its preview off `startsWith("image/")`, and
// the field only ever accepts images.
export function toUploadedPhoto(photo: { uuid: string; url: string | null } | null) {
  if (!photo) return null;
  return {
    uuid: photo.uuid,
    url: photo.url ?? "",
    original_name: "Current photo",
    mime_type: "image/*",
    size: 0,
  };
}
