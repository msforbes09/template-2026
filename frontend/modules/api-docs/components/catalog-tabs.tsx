"use client";

import { Tabs } from "@/components/ui/tabs";
import { resolveTab, useUrlTab } from "@/hooks/use-url-tab";

// The catalog page's tab selection, held in the URL instead of component state.
//
// Same reason every other list control here is URL-driven: a tab is part of
// where you are, not a transient UI flag — it survives a refresh and can be
// linked to or pasted into a ticket.
//
// The URL machinery lives in hooks/use-url-tab.ts, which explains why this
// deliberately avoids useSearchParams — it is shared with the developers
// route's tabs.

export const CATALOG_TABS = ["documentation", "integration", "credentials", "usage"] as const;
export type CatalogTab = (typeof CATALOG_TABS)[number];
export const DEFAULT_CATALOG_TAB: CatalogTab = "documentation";

// Resolves a ?tab= value against the tabs this page actually renders.
//
// The available set differs by page — the anonymous view has no credentials or
// usage tab — and a value naming a tab that isn't there would leave the Tabs
// root pointing at a panel that doesn't exist, i.e. a blank page. Anything
// unrecognised or unavailable falls back to the default, so a hand-typed or
// stale URL degrades to documentation rather than to nothing.
export function resolveCatalogTab(raw: string | null, available: readonly CatalogTab[]): CatalogTab {
  return resolveTab(raw, available, DEFAULT_CATALOG_TAB);
}

export function CatalogTabs({
  available,
  children,
}: {
  // Which tabs this page renders, so an unavailable value can fall back.
  available: readonly CatalogTab[];
  children: React.ReactNode;
}) {
  const { active, select } = useUrlTab({
    available,
    fallback: DEFAULT_CATALOG_TAB,
  });

  return (
    <Tabs value={active} onValueChange={(value) => select(String(value))}>
      {children}
    </Tabs>
  );
}
