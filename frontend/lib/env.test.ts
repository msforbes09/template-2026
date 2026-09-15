import { describe, it, expect, beforeEach, vi } from "vitest";

// lib/env.ts parses at module load, so each case needs a fresh module registry
// with the environment already set the way the case means to test it.
async function loadEnv() {
  vi.resetModules();
  return import("@/lib/env");
}

describe("BETTER_AUTH_SECRET", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects the committed placeholder in production", async () => {
    // The exact hole: the variable is simply absent from the deployment, so
    // the schema default applies. The literal is 39 chars, so .min(32) passes
    // and nothing used to object.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);

    await expect(loadEnv()).rejects.toThrow(/BETTER_AUTH_SECRET is unset/);
  });

  it("rejects the placeholder even when set explicitly in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "dev-only-insecure-secret-change-me-0000");

    await expect(loadEnv()).rejects.toThrow(/BETTER_AUTH_SECRET is unset/);
  });

  it("accepts a real secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(40));

    const { env } = await loadEnv();
    expect(env.BETTER_AUTH_SECRET).toBe("a".repeat(40));
  });

  it("never throws in a production BROWSER bundle", async () => {
    // Regression: the guard used to run client-side too. BETTER_AUTH_SECRET is
    // not NEXT_PUBLIC_, so in the browser it is always undefined and the
    // placeholder default always applies — the parse threw at module
    // evaluation in every production client bundle, taking out every error.tsx
    // that reads env.NODE_ENV.
    (globalThis as Record<string, unknown>).window = {};
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);

    await expect(loadEnv()).resolves.toBeDefined();
    delete (globalThis as Record<string, unknown>).window;
  });

  it("still allows the placeholder outside production, so dev boots without a .env", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);

    const { env } = await loadEnv();
    expect(env.BETTER_AUTH_SECRET).toBe("dev-only-insecure-secret-change-me-0000");
  });
});

describe("NEXT_PUBLIC_APP_NAME", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes the product name with a neutral default", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", undefined);
    const { env } = await loadEnv();
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("App");
  });

  it("reads the product name from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", "Acme Portal");
    const { env } = await loadEnv();
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Acme Portal");
  });
});

describe("Reverb defaults", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  // The template must not point at anyone's real websocket host or key.
  it("default to a local Reverb", async () => {
    vi.stubEnv("NEXT_PUBLIC_REVERB_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_REVERB_APP_KEY", undefined);
    const { env } = await loadEnv();
    expect(env.NEXT_PUBLIC_REVERB_HOST).toBe("localhost");
    expect(env.NEXT_PUBLIC_REVERB_APP_KEY).toBe("local");
    expect(env.NEXT_PUBLIC_REVERB_PORT).toBe(8080);
    expect(env.NEXT_PUBLIC_REVERB_FORCE_TLS).toBe(false);
  });
});
