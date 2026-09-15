import { describe, expect, it } from "vitest";
import { truncateMiddle } from "@/lib/truncate-middle";

const LONG_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf";

describe("truncateMiddle", () => {
  it("returns short values unchanged", () => {
    expect(truncateMiddle("https://example.com/api/v1", 50)).toBe("https://example.com/api/v1");
    expect(truncateMiddle("a".repeat(50), 50)).toBe("a".repeat(50));
  });

  it("keeps the head and tail and elides the middle to at most `max` characters", () => {
    const out = truncateMiddle(LONG_URL, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out).toContain("…");
    expect(out.startsWith("https://raw.githubusercontent.com")).toBe(true);
    expect(out.endsWith("blocklist.conf")).toBe(true);
  });

  it("keeps a URL's origin whole and snaps the tail to a path segment when it fits", () => {
    const out = truncateMiddle("https://api.example.com/v1/administrator/connection-logs/2026-08", 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out).toBe("https://api.example.com…/connection-logs/2026-08");
  });

  it("falls back to a plain head…tail split for non-URL strings", () => {
    const out = truncateMiddle("x".repeat(30) + "MIDDLE" + "y".repeat(30), 20);
    expect(out).toHaveLength(20);
    expect(out).toBe("x".repeat(10) + "…" + "y".repeat(9));
  });

  it("defaults to a max of 50", () => {
    expect(truncateMiddle(LONG_URL).length).toBeLessThanOrEqual(50);
  });

  it("handles empty and null-ish input gracefully", () => {
    expect(truncateMiddle("", 50)).toBe("");
  });
});
