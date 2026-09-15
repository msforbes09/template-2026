import { describe, expect, it } from "vitest";
import {
  normalizeProjectErrors,
  projectSchema,
  type ProjectValues,
} from "@/modules/projects/schemas/project-schema";

const VALID: ProjectValues = {
  name: "eGov Wallet",
  tagline: "Pay government fees from one app",
  description: "# eGov Wallet\n\nA wallet that pays government fees.",
  photo_uuid: "",
  video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  project_url: "https://egov-wallet.example.ph",
  repository_url: "",
  tech_stack: ["Laravel", "Vue"],
  egov_apis_used: ["emessage"],
  egov_event_id: "",
  team_name: "Team Bayanihan",
  team_members: ["Ana", "Ben"],
};

function fieldErrors(values: Partial<ProjectValues>) {
  const result = projectSchema.safeParse({ ...VALID, ...values });
  return result.success ? {} : z_flatten(result.error);
}

// z.treeifyError/flattenError differ across zod minors; read the issues
// directly so the test doesn't depend on which helper is current.
function z_flatten(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "root");
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}

describe("projectSchema", () => {
  it("accepts a complete project", () => {
    expect(projectSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts the optional fields as empty strings", () => {
    expect(
      projectSchema.safeParse({ ...VALID, tagline: "", repository_url: "", photo_uuid: "" })
        .success,
    ).toBe(true);
  });

  it("requires a name, description, video and project link", () => {
    expect(fieldErrors({ name: "" }).name).toBeTruthy();
    expect(fieldErrors({ description: "" }).description).toBeTruthy();
    expect(fieldErrors({ video_url: "" }).video_url).toBeTruthy();
    expect(fieldErrors({ project_url: "" }).project_url).toBeTruthy();
  });

  it("enforces the backend's length caps", () => {
    expect(fieldErrors({ name: "x".repeat(151) }).name).toBeTruthy();
    expect(fieldErrors({ tagline: "x".repeat(161) }).tagline).toBeTruthy();
    expect(fieldErrors({ description: "x".repeat(20_001) }).description).toBeTruthy();
  });

  it("rejects a video that isn't an https YouTube link", () => {
    expect(fieldErrors({ video_url: "https://vimeo.com/12345" }).video_url).toBeTruthy();
    expect(
      fieldErrors({ video_url: "http://www.youtube.com/watch?v=dQw4w9WgXcQ" }).video_url,
    ).toBeTruthy();
  });

  it("rejects non-https project and repository links", () => {
    expect(fieldErrors({ project_url: "http://example.ph" }).project_url).toBeTruthy();
    expect(fieldErrors({ repository_url: "github.com/team/app" }).repository_url).toBeTruthy();
  });

  it("requires between 1 and 30 technologies and eGov APIs", () => {
    expect(fieldErrors({ tech_stack: [] }).tech_stack).toBeTruthy();
    expect(fieldErrors({ egov_apis_used: [] }).egov_apis_used).toBeTruthy();
    expect(fieldErrors({ tech_stack: Array.from({ length: 31 }, (_, i) => `t${i}`) }).tech_stack)
      .toBeTruthy();
  });
});

describe("normalizeProjectErrors", () => {
  it("folds Laravel's per-index array errors onto the array field", () => {
    expect(
      normalizeProjectErrors({
        "egov_apis_used.0": ["The selected api is not active."],
        "tech_stack.2": ["Too long."],
        name: ["Required."],
      }),
    ).toEqual({
      egov_apis_used: ["The selected api is not active."],
      tech_stack: ["Too long."],
      name: ["Required."],
    });
  });

  it("merges several index errors on the same field", () => {
    expect(
      normalizeProjectErrors({
        "egov_apis_used.0": ["first"],
        "egov_apis_used.1": ["second"],
      }),
    ).toEqual({ egov_apis_used: ["first", "second"] });
  });
});
