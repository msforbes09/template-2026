import { describe, it, expect } from "vitest";
import { redact, redactKeys, redactText, REDACTED } from "@/lib/redact";

describe("redactKeys", () => {
  it("masks a sensitive key at the top level", () => {
    expect(redactKeys({ accessToken: "abc123", where: "apiFetch" })).toEqual({
      accessToken: REDACTED,
      where: "apiFetch",
    });
  });

  it("masks the exact fields the DAL leak exposed", () => {
    // The shape internalAdapter.findSession() returns.
    const session = {
      session: { id: "s1", token: "cookie-value", accessToken: "upstream-bearer" },
      user: { id: "u1", email: "citizen@example.com" },
    };
    const out = redactKeys(session) as typeof session;
    expect(out.session.token).toBe(REDACTED);
    expect(out.session.accessToken).toBe(REDACTED);
    // Identifiers survive — they are what a diagnostic actually needs.
    expect(out.session.id).toBe("s1");
    expect(out.user.id).toBe("u1");
  });

  it("masks nested and array-held secrets", () => {
    expect(redactKeys({ list: [{ password: "hunter2" }] })).toEqual({
      list: [{ password: REDACTED }],
    });
  });

  it("leaves ordinary values alone", () => {
    expect(redactKeys({ status: 422, name: "My project" })).toEqual({
      status: 422,
      name: "My project",
    });
  });

  it("stops at the depth cap instead of recursing forever", () => {
    const cyclic: Record<string, unknown> = { name: "root" };
    cyclic.self = cyclic;
    expect(() => redactKeys(cyclic)).not.toThrow();
  });
});

describe("redactText", () => {
  it("masks an Authorization header value", () => {
    expect(redactText("failed with Authorization: Bearer abcdef123456")).not.toContain(
      "abcdef123456",
    );
  });

  it("masks a JWT anywhere in the text", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1g";
    expect(redactText(`upstream said ${jwt} was expired`)).not.toContain(jwt);
  });

  it("masks a self-naming JSON fragment", () => {
    expect(redactText('{"accessToken":"s3cr3tvalue"}')).not.toContain("s3cr3tvalue");
  });

  it("keeps ordinary diagnostics readable", () => {
    const message = "GET /projects failed with 500: Server Error";
    expect(redactText(message)).toBe(message);
  });
});

describe("redact", () => {
  it("dispatches on type", () => {
    expect(redact("Bearer abcdef123456")).toContain(REDACTED);
    expect(redact({ token: "x" })).toEqual({ token: REDACTED });
  });

  it("never throws", () => {
    const hostile = {
      get boom() {
        throw new Error("nope");
      },
    };
    expect(() => redact(hostile)).not.toThrow();
  });
});
