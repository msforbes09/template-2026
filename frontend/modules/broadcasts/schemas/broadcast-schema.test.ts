import { describe, it, expect } from "vitest";
import {
  broadcastSchema,
  toBroadcastPayload,
  toBroadcastValues,
  EMPTY_BROADCAST_VALUES,
  type BroadcastValues,
} from "@/modules/broadcasts/schemas/broadcast-schema";

const VALID: BroadcastValues = {
  ...EMPTY_BROADCAST_VALUES,
  title: "Scheduled maintenance",
  body: "The platform will be down Saturday 02:00–04:00.",
};

function issues(values: BroadcastValues) {
  const result = broadcastSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("broadcastSchema", () => {
  it("accepts a minimal everyone broadcast", () => {
    expect(broadcastSchema.safeParse(VALID).success).toBe(true);
  });

  it("requires a title and a message", () => {
    expect(issues({ ...VALID, title: "" })).toContain("title");
    expect(issues({ ...VALID, body: "   " })).toContain("body");
  });

  it("enforces the API's length caps", () => {
    expect(issues({ ...VALID, title: "x".repeat(151) })).toContain("title");
    expect(broadcastSchema.safeParse({ ...VALID, title: "x".repeat(150) }).success).toBe(true);
    expect(issues({ ...VALID, body: "x".repeat(1001) })).toContain("body");
    expect(broadcastSchema.safeParse({ ...VALID, body: "x".repeat(1000) }).success).toBe(true);
  });

  it("requires a citizen when targeting a single user", () => {
    expect(issues({ ...VALID, audience: "user" })).toContain("user_uuid");
    expect(
      broadcastSchema.safeParse({ ...VALID, audience: "user", user_uuid: "9d3f" }).success,
    ).toBe(true);
  });

  it("refuses an empty segment", () => {
    // An unfilled "segment" reaches exactly the people the Everyone audience
    // reaches — which is the one case that requires a typed confirmation.
    // Allowing it would be a way around that guard.
    expect(issues({ ...VALID, audience: "segment" })).toContain("type");
    expect(
      broadcastSchema.safeParse({ ...VALID, audience: "segment", type: "developer" }).success,
    ).toBe(true);
    expect(
      broadcastSchema.safeParse({ ...VALID, audience: "segment", status: "approved" }).success,
    ).toBe(true);
  });
});

describe("toBroadcastPayload", () => {
  it("sends no targeting keys at all for everyone", () => {
    // Not `type: null` — the handoff says the ABSENCE of the fields is what
    // means everyone, and a PUT replaces targeting wholesale.
    expect(toBroadcastPayload(VALID)).toEqual({
      title: "Scheduled maintenance",
      body: "The platform will be down Saturday 02:00–04:00.",
    });
  });

  it("sends only the segment keys that were chosen", () => {
    expect(
      toBroadcastPayload({ ...VALID, audience: "segment", type: "developer", status: "" }),
    ).toMatchObject({ type: "developer" });
    expect(
      toBroadcastPayload({ ...VALID, audience: "segment", type: "developer", status: "" }),
    ).not.toHaveProperty("status");
  });

  it("never sends user_uuid alongside type or status", () => {
    // The combination the API answers 422 for. The mode makes it
    // unexpressible; this pins that.
    const payload = toBroadcastPayload({
      ...VALID,
      audience: "user",
      user_uuid: "9d3f",
      type: "developer",
      status: "approved",
    });
    expect(payload).toMatchObject({ user_uuid: "9d3f" });
    expect(payload).not.toHaveProperty("type");
    expect(payload).not.toHaveProperty("status");
  });

  it("drops stale segment values when the mode is everyone", () => {
    // Switching the radio back to Everyone after filling a segment must not
    // leave the old filters in the payload.
    expect(
      toBroadcastPayload({
        ...VALID,
        audience: "everyone",
        type: "developer",
        status: "approved",
        user_uuid: "9d3f",
      }),
    ).toEqual({
      title: "Scheduled maintenance",
      body: "The platform will be down Saturday 02:00–04:00.",
    });
  });

  it("trims what it sends", () => {
    expect(toBroadcastPayload({ ...VALID, title: "  Hi  ", body: "  There  " })).toEqual({
      title: "Hi",
      body: "There",
    });
  });
});

describe("toBroadcastValues", () => {
  const base = { title: "T", body: "B" };

  it("reads null filters back as the everyone mode", () => {
    expect(toBroadcastValues({ ...base, filters: null })).toMatchObject({
      audience: "everyone",
      type: "",
      status: "",
      user_uuid: "",
    });
  });

  it("reads a segment back into its dropdowns", () => {
    expect(
      toBroadcastValues({ ...base, filters: { type: "developer", status: "approved" } }),
    ).toMatchObject({ audience: "segment", type: "developer", status: "approved" });
  });

  it("reads a single-user draft back into the user mode", () => {
    expect(toBroadcastValues({ ...base, filters: { user_uuid: "9d3f" } })).toMatchObject({
      audience: "user",
      user_uuid: "9d3f",
    });
  });

  it("round-trips a draft through values and back to a payload", () => {
    const filters = { type: "developer" };
    const values = toBroadcastValues({ ...base, filters });
    expect(toBroadcastPayload(values)).toEqual({ title: "T", body: "B", type: "developer" });
  });
});
