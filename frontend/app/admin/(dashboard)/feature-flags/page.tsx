import type { Metadata } from "next";
import { Suspense } from "react";
import {
  FeatureFlagsList,
  FeatureFlagsListSkeleton,
} from "@/modules/feature-flags/components/feature-flags-list";

export const metadata: Metadata = {
  title: "System controls",
  robots: { index: false, follow: false },
};

export default function AdminFeatureFlagsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System controls</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Runtime switches for the user-facing portal. A change takes effect
          immediately — there is no deploy and no restart. Developer
          administrators only.
        </p>
      </div>
      {/* The guard lives in the list, which reads the session before the
          fetch. Suspense so the shell renders while it resolves. */}
      <Suspense fallback={<FeatureFlagsListSkeleton />}>
        <FeatureFlagsList />
      </Suspense>
    </div>
  );
}
