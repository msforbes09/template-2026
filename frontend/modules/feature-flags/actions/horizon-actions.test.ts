import { beforeEach, describe, expect, it, vi } from "vitest";

// The seam: the admin session guard and the API client. Hoisted because
// vi.mock factories run before ordinary top-level bindings.
const { requireAdminSession, apiFetch } = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/auth/dal", () => ({ requireAdminSession }));
vi.mock("@/lib/api-client", () => ({ apiFetch }));
vi.mock("@/lib/log-error", () => ({ logError: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { NODE_ENV: "test" } }));

import { getHorizonAccessUrl } from "@/modules/feature-flags/actions/horizon-actions";

describe("getHorizonAccessUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mints a handoff link as the admin and returns it", async () => {
    apiFetch.mockResolvedValue({
      data: { url: "https://horizon.example.test/horizon-access?expires=1&signature=s", expires_at: "2026-09-16 13:01:00" },
    });

    await expect(getHorizonAccessUrl()).resolves.toEqual({
      ok: true,
      data: { url: "https://horizon.example.test/horizon-access?expires=1&signature=s" },
    });

    expect(requireAdminSession).toHaveBeenCalledOnce();
    expect(apiFetch).toHaveBeenCalledWith("/horizon/access", { method: "POST" }, "admin");
  });

  it("returns a failed result instead of throwing", async () => {
    apiFetch.mockRejectedValue(new Error("upstream down"));

    const result = await getHorizonAccessUrl();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("Something went wrong.");
  });
});
