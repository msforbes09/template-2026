import { describe, expect, it } from "vitest";
import {
  projectCredits,
  toProjectInput,
  toProjectValues,
  withEvent,
} from "@/modules/projects/lib/project-payload";
import type { ProjectValues } from "@/modules/projects/schemas/project-schema";
import type { Project } from "@/types/project";

const VALUES: ProjectValues = {
  name: "  eGov Wallet  ",
  tagline: "",
  description: "# Wallet",
  photo_uuid: "",
  video_url: "https://youtu.be/dQw4w9WgXcQ",
  project_url: "https://wallet.example.ph",
  repository_url: "",
  tech_stack: ["Laravel", " Vue "],
  egov_apis_used: ["emessage"],
  egov_event_id: "",
  team_name: "",
  team_members: [],
};

const PROJECT: Project = {
  uuid: "u-1",
  name: "eGov Wallet",
  tagline: "Pay fees",
  description: "# Wallet",
  photo: { uuid: "file-1", url: "https://cdn.test/x.png" },
  video_url: "https://youtu.be/dQw4w9WgXcQ",
  project_url: "https://wallet.example.ph",
  repository_url: null,
  tech_stack: ["Laravel"],
  egov_apis_used: ["emessage"],
  meta: { team: "Team Bayanihan", members: ["Ana", "Ben"] },
  tags: ["Mobile"],
  status: "draft",
  assessment_remarks: null,
  is_published: 0,
  is_public: 0,
  published_at: null,
  created_at: "2026-08-01 09:00:00",
  updated_at: "2026-08-01 09:00:00",
};

describe("toProjectInput", () => {
  it("trims text and always sends the required fields", () => {
    const input = toProjectInput(VALUES);
    expect(input.name).toBe("eGov Wallet");
    expect(input.description).toBe("# Wallet");
    expect(input.video_url).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(input.project_url).toBe("https://wallet.example.ph");
    expect(input.tech_stack).toEqual(["Laravel", "Vue"]);
    expect(input.egov_apis_used).toEqual(["emessage"]);
  });

  // A blank optional sent as `null` on create makes the endpoint answer
  // 400 data_processing_failed, so on create the key is left out entirely.
  it("OMITS blank optionals on create", () => {
    const input = toProjectInput(VALUES);
    expect("tagline" in input).toBe(false);
    expect("photo_uuid" in input).toBe(false);
    expect("repository_url" in input).toBe(false);
    expect("meta" in input).toBe(false);
  });

  it("still sends optionals on create when they carry a value", () => {
    const input = toProjectInput({
      ...VALUES,
      tagline: "Pay fees",
      photo_uuid: "file-1",
      repository_url: "https://github.com/team/app",
      team_name: "Team Bayanihan",
    });
    expect(input.tagline).toBe("Pay fees");
    expect(input.photo_uuid).toBe("file-1");
    expect(input.repository_url).toBe("https://github.com/team/app");
    expect(input.meta).toEqual({ team: "Team Bayanihan" });
  });

  // Update is a partial update: an omitted key means "leave this alone", so
  // null is the only way to clear a field that was previously set.
  it("sends blank optionals as null on update, so they can be cleared", () => {
    const input = toProjectInput(VALUES, { partial: true });
    expect(input.tagline).toBeNull();
    expect(input.photo_uuid).toBeNull();
    expect(input.repository_url).toBeNull();
    expect(input.meta).toBeNull();
  });

  it("sends only the meta keys that carry something", () => {
    expect(toProjectInput({ ...VALUES, team_name: "Team Bayanihan" }).meta).toEqual({
      team: "Team Bayanihan",
    });
    expect(toProjectInput({ ...VALUES, team_members: ["Ana", "  ", "Ben"] }).meta).toEqual({
      members: ["Ana", "Ben"],
    });
  });
});

describe("toProjectInput event handling", () => {
  // egov_event_id is accepted on POST only; the API ignores it on PUT, so
  // sending it there would imply a move that never happened.
  it("sends the chosen event on create", () => {
    expect(toProjectInput({ ...VALUES, egov_event_id: "3" }).egov_event_id).toBe(3);
  });

  it("omits it on create when no event was chosen", () => {
    expect("egov_event_id" in toProjectInput(VALUES)).toBe(false);
  });

  it("never sends it on update, where the API would ignore it", () => {
    const input = toProjectInput({ ...VALUES, egov_event_id: "3" }, { partial: true });
    expect("egov_event_id" in input).toBe(false);
  });

  it("lets an admin set or clear the event explicitly", () => {
    expect(withEvent(toProjectInput(VALUES), "7").egov_event_id).toBe(7);
    expect(withEvent(toProjectInput(VALUES), "").egov_event_id).toBeNull();
  });
});

describe("toProjectValues", () => {
  it("seeds the form from a project, flattening photo and meta", () => {
    expect(toProjectValues(PROJECT)).toEqual({
      name: "eGov Wallet",
      tagline: "Pay fees",
      description: "# Wallet",
      photo_uuid: "file-1",
      video_url: "https://youtu.be/dQw4w9WgXcQ",
      project_url: "https://wallet.example.ph",
      repository_url: "",
      tech_stack: ["Laravel"],
      egov_apis_used: ["emessage"],
      egov_event_id: "",
      team_name: "Team Bayanihan",
      team_members: ["Ana", "Ben"],
    });
  });

  it("survives a meta bag that doesn't follow the team/members convention", () => {
    const values = toProjectValues({ ...PROJECT, meta: { team: 42, members: "Ana" } });
    expect(values.team_name).toBe("");
    expect(values.team_members).toEqual([]);
  });

  it("survives a null meta and a missing photo", () => {
    const values = toProjectValues({ ...PROJECT, meta: null, photo: null });
    expect(values.team_name).toBe("");
    expect(values.photo_uuid).toBe("");
  });
});

describe("projectCredits", () => {
  it("reads team and members out of the free-form bag", () => {
    expect(projectCredits({ team: "Team Bayanihan", members: ["Ana", "Ben"] })).toEqual({
      team: "Team Bayanihan",
      members: ["Ana", "Ben"],
    });
  });

  it("returns nothing creditable for an empty or malformed bag", () => {
    expect(projectCredits(null)).toEqual({ team: null, members: [] });
    expect(projectCredits({ team: "   ", members: [1, 2] })).toEqual({ team: null, members: [] });
  });
});
