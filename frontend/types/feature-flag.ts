// Runtime feature flags (2026-09-02 handoff). The backend owns them: the env
// vars that used to live in lib/env.ts are now only the BACKEND's defaults,
// and an administrator's stored override wins over them until the application
// cache is cleared.
//
// Names are stable identifiers — the same string is the key in the public map
// and the {name} segment of the admin PUT path.
export const FEATURE_FLAG_NAMES = [
  "developer_applications",
  "project_reviews",
  "api_catalog_reviews",
  "maintenance_mode",
] as const;

export type FeatureFlagName = (typeof FEATURE_FLAG_NAMES)[number];

// GET common/feature-flags — `{ data: { name: 0 | 1 } }`, booleans on the wire
// as 1/0 like every other flag this API returns.
export type FeatureFlagMap = Record<FeatureFlagName, boolean>;

// GET administrator/feature-flags — the same flags as a list, which is the
// shape the management screen renders.
export type AdminFeatureFlag = {
  name: string;
  enabled: 0 | 1;
};
