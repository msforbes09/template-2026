import "server-only";
import { apiFetch } from "@/lib/api-client";

// The landing page's numbers, one request: GET /dashboard/summary replaced the
// six per_page=1 list counts on 2026-08-31. The BE gates each block by the
// caller's own view ability (users-view / projects-view) and omits — never
// zeroes — a block the admin can't act on, so presence doubles as the
// permission signal. `my_claims` is the caller's own open assessment claims
// and is always live; the global blocks may be up to a minute stale (shared
// BE cache).
export type DashboardSummary = {
  users?: {
    for_assessment: number;
    for_resubmission: number;
    suspended: number;
    developers: number;
  };
  projects?: {
    for_assessment: number;
    for_publishing: number;
    for_resubmission: number;
    published: number;
  };
  my_claims?: { users?: number; projects?: number };
};

// Null on any failure, and the landing sections simply don't render — with one
// request there is no longer a per-number failure state to show as "—".
// Tagged with BOTH list tags so every mutation that revalidates the users or
// projects list today refreshes these numbers too, with no extra wiring.
export async function getDashboardSummary(): Promise<DashboardSummary | null> {
  try {
    const { data } = await apiFetch<{ data: DashboardSummary }>(
      "/dashboard/summary",
      { next: { tags: ["users", "admin-projects"] } },
      "admin",
    );
    return data;
  } catch {
    return null;
  }
}
