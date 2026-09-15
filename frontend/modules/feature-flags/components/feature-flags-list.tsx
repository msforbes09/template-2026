import { AlertTriangle, Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminFeatureFlags } from "@/modules/feature-flags/lib/get-admin-feature-flags";
import { FeatureFlagToggle } from "@/modules/feature-flags/components/feature-flag-toggle";

// What each flag actually does, in the words an administrator needs to decide
// whether to touch it. The backend sends only `{name, enabled}`, so the
// explanation has to live here — keyed by the stable flag name.
//
// An unrecognised flag still renders, with its raw name and no description:
// the backend can add one before this map knows about it, and hiding it would
// leave a switch nobody could find.
const FLAG_COPY: Record<string, { label: string; description: string; destructive?: boolean }> = {
  maintenance_mode: {
    label: "Maintenance mode",
    description:
      "Takes the whole user portal and public site down behind a maintenance page, and stops non-developer administrators signing in. Sign-in and registration stop responding. Developer administrators are unaffected.",
    destructive: true,
  },
};

export async function FeatureFlagsList() {
  const result = await getAdminFeatureFlags();

  // 403 is the expected answer for a non-developer administrator, not a fault.
  // The nav entry is already hidden from them, so reaching this means a typed
  // URL — which deserves a straight answer rather than an error page.
  if (!result.ok && result.forbidden) {
    return (
      <EmptyState
        icon={Lock}
        title="System controls are developer-only"
        description="These switches are limited to administrators marked as developers. If you have just been made one, sign out and back in — the ability is granted at sign-in."
      />
    );
  }

  if (!result.ok) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the system controls"
        description={result.message}
      />
    );
  }

  return (
    <ul className="rounded-xl border border-border bg-card px-5">
      {result.flags.map((flag) => {
        const copy = FLAG_COPY[flag.name];
        const label = copy?.label ?? flag.name;
        return (
          <li
            key={flag.name}
            className="flex items-start justify-between gap-6 border-t border-border py-5 first:border-t-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{label}</p>
              {copy && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {copy.description}
                </p>
              )}
              {/* The stable identifier, shown because it is what the API path
                  and any support conversation will use. */}
              <p className="mt-1 font-mono text-xs text-muted-foreground/70">{flag.name}</p>
            </div>
            <div className="shrink-0 pt-0.5">
              <FeatureFlagToggle
                name={flag.name}
                label={label}
                enabled={flag.enabled === 1}
                destructive={copy?.destructive}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// One row, matching the real list's dimensions.
export function FeatureFlagsListSkeleton() {
  return (
    <div aria-hidden className="rounded-xl border border-border bg-card px-5">
      {Array.from({ length: 1 }).map((_, index) => (
        <div key={index} className="flex items-start justify-between gap-6 border-t border-border py-5 first:border-t-0">
          <div className="w-full space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="h-5 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
