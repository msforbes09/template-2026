import { Suspense } from "react";
import { SiteHeader } from "@/modules/site/components/site-header";
import { ConditionalSiteFooter } from "@/modules/site/components/conditional-site-footer";
import { AssistantMount } from "@/modules/assistant/components/assistant-mount";
import { MaintenanceGate } from "@/modules/feature-flags/components/maintenance-gate";

// Wrapped in MaintenanceGate: while `maintenance_mode` is on this shell is
// replaced wholesale rather than decorated with a banner. Every user/* endpoint
// is down during maintenance — login and registration included — along with the
// public project and event catalogue, so leaving the header up would offer a
// row of links that all fail.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MaintenanceGate>
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      {/* flex column so a page can opt into filling the window with
          `flex-1 min-h-0` (the assistant does). The layout wrapper only sets
          min-h-dvh, so a percentage height on a child never resolves —
          flexbox does.
          `[&>*]:w-full` is not cosmetic: as flex items, page roots that use
          `mx-auto max-w-*` lose their stretch, because auto inline margins
          override align-self and collapse the box to fit-content. That
          centred and shrank every such page (a catalog page measured 584px
          inside a 1100px main, and skeletons shrank hardest of all). Forcing
          width:100% restores exactly the block behaviour those pages were
          written against, while max-w-* and mx-auto keep doing their job. */}
      <main className="flex flex-1 flex-col [&>*]:w-full">{children}</main>
      {/* No matching skeleton — the footer is either fully absent
          (/dashboard) or renders in full; a partial skeleton for a
          mega-footer isn't a meaningful loading state. Suspense is here only
          because usePathname() needs a boundary under cacheComponents on
          dynamic-param routes (see use-pathname.md). */}
      <Suspense fallback={null}>
        <ConditionalSiteFooter />
      </Suspense>
      {/* Renders nothing unless the assistant is enabled AND Vertex is
          configured, so no chat JS ships on a deployment that hasn't set it up.
          Suspense-wrapped because the gate is read at request time rather than
          baked into the prerender — see AssistantMount for why that matters.
          fallback={null}: a launcher skeleton would just be a button that
          can't be pressed yet. */}
      <Suspense fallback={null}>
        <AssistantMount />
      </Suspense>
    </div>
    </MaintenanceGate>
  );
}
