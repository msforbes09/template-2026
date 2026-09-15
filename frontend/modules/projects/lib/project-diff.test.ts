import { describe, expect, it } from "vitest";
import { diffProjectSnapshot,
  diffDisplayValue,
} from "@/modules/projects/lib/project-diff";
import type { ProjectSnapshot } from "@/types/project";

const SNAPSHOT: ProjectSnapshot = {
  name: "eGov Wallet",
  tagline: "Pay fees",
  description: "# Wallet",
  photo: { uuid: "file-1", url: "https://cdn.test/x.png?Signature=abc" },
  video_url: "https://youtu.be/dQw4w9WgXcQ",
  project_url: "https://wallet.example.ph",
  repository_url: null,
  tech_stack: ["Laravel", "Vue"],
  egov_apis_used: ["emessage"],
  meta: { team: "Team Bayanihan", members: ["Ana", "Ben"] },
};

describe("diffProjectSnapshot", () => {
  it("reports nothing when the working copy matches what's live", () => {
    expect(diffProjectSnapshot({ ...SNAPSHOT }, SNAPSHOT)).toEqual([]);
  });

  it("ignores a re-signed photo URL, since only the uuid identifies the file", () => {
    const working = {
      ...SNAPSHOT,
      photo: { uuid: "file-1", url: "https://cdn.test/x.png?Signature=zzz-regenerated" },
    };
    expect(diffProjectSnapshot(working, SNAPSHOT)).toEqual([]);
  });

  it("reports a replaced or removed photo", () => {
    expect(diffProjectSnapshot({ ...SNAPSHOT, photo: { uuid: "file-2", url: "u" } }, SNAPSHOT)).toEqual([
      "photo",
    ]);
    expect(diffProjectSnapshot({ ...SNAPSHOT, photo: null }, SNAPSHOT)).toEqual(["photo"]);
  });

  it("treats null and empty string as the same for optional text", () => {
    expect(diffProjectSnapshot({ ...SNAPSHOT, repository_url: "" }, SNAPSHOT)).toEqual([]);
    expect(diffProjectSnapshot({ ...SNAPSHOT, tagline: null }, { ...SNAPSHOT, tagline: "" })).toEqual(
      [],
    );
  });

  it("reports reordered and changed lists", () => {
    expect(diffProjectSnapshot({ ...SNAPSHOT, tech_stack: ["Vue", "Laravel"] }, SNAPSHOT)).toEqual([
      "tech_stack",
    ]);
    expect(
      diffProjectSnapshot({ ...SNAPSHOT, egov_apis_used: ["emessage", "everify"] }, SNAPSHOT),
    ).toEqual(["egov_apis_used"]);
  });

  it("ignores meta key order but catches a real credit change", () => {
    expect(
      diffProjectSnapshot(
        { ...SNAPSHOT, meta: { members: ["Ana", "Ben"], team: "Team Bayanihan" } },
        SNAPSHOT,
      ),
    ).toEqual([]);
    expect(diffProjectSnapshot({ ...SNAPSHOT, meta: { team: "Team B" } }, SNAPSHOT)).toEqual(["meta"]);
    expect(diffProjectSnapshot({ ...SNAPSHOT, meta: null }, SNAPSHOT)).toEqual(["meta"]);
  });

  it("lists every changed field at once", () => {
    expect(
      diffProjectSnapshot(
        { ...SNAPSHOT, name: "New", description: "# New", video_url: "https://youtu.be/aaaaaaaaaaa" },
        SNAPSHOT,
      ),
    ).toEqual(["name", "description", "video_url"]);
  });
});

// The "What changed" cards print Before/After rows for the short fields;
// this is the one place a snapshot value becomes display text (description
// and photo render richer than text and bypass it).
describe("diffDisplayValue", () => {
  const base = {
    name: "TrabahoMatch",
    tagline: null,
    description: "# md",
    photo: null,
    video_url: "https://youtu.be/x",
    project_url: "https://example.com",
    repository_url: null,
    tech_stack: ["Laravel", "Next.js"],
    egov_apis_used: ["everify"],
    meta: { team: "Team Bayanihan", members: ["Ana", "Ben"] },
  };

  it("prints strings as they are and null as null", () => {
    expect(diffDisplayValue(base, "name")).toBe("TrabahoMatch");
    expect(diffDisplayValue(base, "tagline")).toBeNull();
    expect(diffDisplayValue(base, "repository_url")).toBeNull();
  });

  it("joins list fields", () => {
    expect(diffDisplayValue(base, "tech_stack")).toBe("Laravel · Next.js");
    expect(diffDisplayValue(base, "egov_apis_used")).toBe("everify");
    expect(diffDisplayValue({ ...base, tech_stack: [] }, "tech_stack")).toBeNull();
  });

  it("prints the meta bag as compact readable JSON", () => {
    expect(diffDisplayValue(base, "meta")).toBe(
      '{"team":"Team Bayanihan","members":["Ana","Ben"]}',
    );
    expect(diffDisplayValue({ ...base, meta: null }, "meta")).toBeNull();
  });
});
