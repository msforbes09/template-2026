import { describe, it, expect, vi, afterEach } from "vitest";
import { safeErrorMessage, GENERIC_MESSAGE } from "@/lib/safe-error-message";
import type { ApiError } from "@/lib/api-error";

// ApiError is a TYPE, not a class — apiFetch builds it by decorating a real
// Error (see buildApiError's note on why it must be a genuine Error). Mirror
// that here rather than faking the shape with a plain object.
function apiError(status: number, message: string): ApiError {
  return Object.assign(new Error(message), { status, errors: {} });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("safeErrorMessage", () => {
  it("passes 4xx through — validation and not-found text is written for the user", () => {
    expect(safeErrorMessage(apiError(422, "The name field is required."))).toBe(
      "The name field is required.",
    );
    expect(safeErrorMessage(apiError(404, "Not found."))).toBe("Not found.");
    expect(safeErrorMessage(apiError(403, "This action is unauthorized."))).toBe(
      "This action is unauthorized.",
    );
  });

  it("returns the fallback for a non-API error", () => {
    // A network or parse failure has no user-facing contract, so its message
    // never reaches the page whatever the environment.
    expect(safeErrorMessage(new TypeError("fetch failed"), "Couldn't load it.")).toBe(
      "Couldn't load it.",
    );
    expect(safeErrorMessage("a thrown string", "Couldn't load it.")).toBe("Couldn't load it.");
  });

  it("defaults the fallback to the generic message", () => {
    expect(safeErrorMessage(new Error("boom"))).toBe(GENERIC_MESSAGE);
  });

  it("shows 5xx detail outside production, so a failing page is debuggable", () => {
    // The suite runs with NODE_ENV=test, which is the non-production branch.
    expect(safeErrorMessage(apiError(500, "SQLSTATE[HY000] /var/www/app.php:88"))).toBe(
      "SQLSTATE[HY000] /var/www/app.php:88",
    );
  });

  it("masks 5xx in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(40));
    vi.resetModules();
    const { safeErrorMessage: safeInProd, GENERIC_MESSAGE: generic } = await import(
      "@/lib/safe-error-message"
    );

    const leaked = apiError(
      500,
      "SQLSTATE[HY000] at /var/www/app.php:88 — could not connect to db-primary.internal",
    );
    expect(safeInProd(leaked)).toBe(generic);
    // 4xx still passes through in production.
    expect(safeInProd(apiError(422, "Required."))).toBe("Required.");
  });
});
