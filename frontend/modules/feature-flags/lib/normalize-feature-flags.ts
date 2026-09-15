import { FEATURE_FLAG_NAMES, type FeatureFlagMap } from "@/types/feature-flag";

// Every flag ON and not in maintenance. This is what an unreachable, empty or
// malformed flag map resolves to, and the direction of that failure is a
// decision worth stating rather than an accident.
//
// FAILING OPEN. A blip on one endpoint must not blank the review threads,
// remove the apply CTA, or — worst of all — throw the whole site behind a
// maintenance page nobody asked for. The cost of failing open is the opposite
// and much smaller: a control is briefly offered whose endpoint then refuses
// it, which every one of those surfaces already handles, since the API is the
// authority regardless.
//
// Maintenance is safe to fail open because it has a SECOND signal — the 503
// `service_unavailable` interceptor, which needs no successful read at all.
export const DEFAULT_FEATURE_FLAGS: FeatureFlagMap = {
  developer_applications: true,
  project_reviews: true,
  api_catalog_reviews: true,
  maintenance_mode: false,
};

// The wire shape is `{ "project_reviews": 1 }` — 1/0, like every other boolean
// this API returns. Read key by key against the names we know rather than
// trusting the body:
//
//   - a flag the backend adds later is ignored until FEATURE_FLAG_NAMES knows
//     about it, instead of arriving as an unhandled key;
//   - a flag it stops sending falls back to its default rather than reading as
//     `undefined` and therefore falsy at the call site — which for
//     maintenance_mode is the difference between a working site and a
//     maintenance page nobody switched on.
export function normalizeFeatureFlags(data: unknown): FeatureFlagMap {
  if (!data || typeof data !== "object") return { ...DEFAULT_FEATURE_FLAGS };

  const source = data as Record<string, unknown>;
  const flags = { ...DEFAULT_FEATURE_FLAGS };

  for (const name of FEATURE_FLAG_NAMES) {
    const value = source[name];
    if (value === undefined || value === null) continue;
    flags[name] = value === 1 || value === true || value === "1";
  }

  return flags;
}
