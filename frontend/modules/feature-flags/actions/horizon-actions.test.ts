import { beforeEach, describe, expect, it, vi } from "vitest";

// The seam: the admin session guard, the API client, and Next's redirect.
// Hoisted because vi.mock factories run before ordinary top-level bindings.
const { requireAdminSession, apiFetch, redirect } = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  apiFetch: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/dal", () => ({ requireAdminSession }));
vi.mock("@/lib/api-client", () => ({ apiFetch }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/log-error", () => ({ logError: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { NODE_ENV: "test" } }));

import { openHorizon } from "@/modules/feature-flags/actions/horizon-actions";

describe("openHorizon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mints a handoff link as the admin and sends the browser there", async () => {
    apiFetch.mockResolvedValue({
      data: { url: "https://horizon.example.test/horizon-access?expires=1&signature=s", expires_at: "2026-09-16 13:01:00" },
    });

    await expect(openHorizon()).rejects.toThrow(
      "NEXT_REDIRECT:https://horizon.example.test/horizon-access?expires=1&signature=s",
    );

    expect(requireAdminSession).toHaveBeenCalledOnce();
    expect(apiFetch).toHaveBeenCalledWith("/horizon/access", { method: "POST" }, "admin");
  });

  it("surfaces a failure instead of redirecting", async () => {
    apiFetch.mockRejectedValue(new Error("upstream down"));

    await expect(openHorizon()).rejects.toThrow(/Couldn't open Horizon/);
    expect(redirect).not.toHaveBeenCalled();
  });
});
