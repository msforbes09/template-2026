"use client";

import { Tabs } from "@/components/ui/tabs";
import { resolveTab, useUrlTab } from "@/hooks/use-url-tab";

// The developers page's two halves — the catalogue of services this account
// can integrate with, and the calls it has actually made against them.
//
// They were two routes, /dashboard/developers and /dashboard/usage, which
// split one question ("what can I call, and how is it going?") across a
// navigation step. Same audience, same gate, same subject.
//
// Held in ?tab= like the catalog show route, and for the same reasons — see
// hooks/use-url-tab.ts, which both share.

export const DEVELOPER_TABS = ["catalog", "usage"] as const;
export type DeveloperTab = (typeof DEVELOPER_TABS)[number];
// The catalogue leads: it answers what is available, which is the question
// that comes first and the only one an account with no calls yet can act on.
export const DEFAULT_DEVELOPER_TAB: DeveloperTab = "catalog";

export function resolveDeveloperTab(raw: string | null): DeveloperTab {
  return resolveTab(raw, DEVELOPER_TABS, DEFAULT_DEVELOPER_TAB);
}

export function DeveloperTabs({ children }: { children: React.ReactNode }) {
  const { active, select } = useUrlTab({
    available: DEVELOPER_TABS,
    fallback: DEFAULT_DEVELOPER_TAB,
  });

  return (
    <Tabs value={active} onValueChange={(value) => select(String(value))}>
      {children}
    </Tabs>
  );
}
