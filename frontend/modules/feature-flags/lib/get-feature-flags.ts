import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
} from "@/modules/feature-flags/lib/normalize-feature-flags";
import type { FeatureFlagMap } from "@/types/feature-flag";

export const FEATURE_FLAGS_TAG = "feature-flags";

// The public flag map. Unauthenticated, and deliberately still served while
// maintenance mode is on — it is how the UI learns that maintenance is on.
//
// Cached rather than read per request: this is consulted by the site layout
// and by most public pages, so an uncached read would add a backend round trip
// to nearly every render. `minutes` bounds how stale a flip can be, and the
// admin toggle revalidates FEATURE_FLAGS_TAG so a deliberate change lands at
// once instead of waiting it out.
//
// Never rejects. It is reached from prerendered pages, and a rejection thrown
// out of a `"use cache"` scope is not caught by the caller during prerendering
// — it fails the build. Same rule as get-public-projects.ts.
export async function getFeatureFlags(): Promise<FeatureFlagMap> {
  "use cache";
  cacheTag(FEATURE_FLAGS_TAG);
  cacheLife("minutes");

  try {
    const { data } = await apiFetch<{ data: unknown }>(
      "/feature-flags",
      {},
      undefined,
      "/common",
    );
    return normalizeFeatureFlags(data);
  } catch {
    // Deliberately swallowed without logError: this runs inside a `"use cache"`
    // scope on public pages, and apiFetch has already reported the failure.
    // Failing open is the point — see DEFAULT_FEATURE_FLAGS.
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

// Sugar for the common case, so a call site reads as a question about one
// feature rather than a map lookup.
export async function isFeatureEnabled(name: keyof FeatureFlagMap): Promise<boolean> {
  return (await getFeatureFlags())[name];
}
