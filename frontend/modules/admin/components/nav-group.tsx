"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  encodeNavGroupToggle,
  isGroupRoute,
  NAV_GROUP_FOLDED,
  NAV_GROUP_OPEN,
  navGroupLocation,
  resolveNavGroupOpen,
} from "@/modules/admin/lib/nav-group-state";

// A foldable nav entry: the parent link plus a chevron that folds its
// sub-list. Folded by default, auto-open on the group's own routes, manual
// toggles honored only until the next navigation — the precedence is
// resolveNavGroupOpen, tested in nav-group-state.test.ts.
//
// The parent stays a real link (clicking navigates); only the chevron folds.
// A client leaf so the server-rendered sub-list arrives as `children` and the
// nav around it stays on the server.
//
// A toggle lives for the current visit only — deliberately NOT persisted.
// It used to be written to sessionStorage keyed by location, which meant
// RETURNING to a URL where you had once unfolded a group re-opened it by
// itself, minutes later, looking spontaneous. Unfolding a group is an intent
// to navigate into it; the intent is spent as soon as you go somewhere.

export function NavGroup({
  storageKey,
  label,
  prefixes,
  parent,
  children,
}: {
  // Names the sub-list element (aria-controls). Kept as `storageKey` from
  // when a toggle was persisted under it; it is only an id now.
  storageKey: string;
  // Accessible name for the toggle ("Users" -> "Fold Users submenu").
  label: string;
  // Route prefixes that count as "inside" this group — see isGroupRoute.
  prefixes: readonly string[];
  parent: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Toggles scope to the FULL location — submenu entries navigate by query
  // string alone, and a pathname-scoped toggle would survive all of them.
  const location = navGroupLocation(pathname, useSearchParams().toString());
  const isActive = isGroupRoute(pathname, prefixes);

  // Scoped to the location it was made at, so any navigation — a query-only
  // submenu hop included — discards it and the group folds on its own.
  const [localToggle, setLocalToggle] = useState<string | null>(null);

  const open = resolveNavGroupOpen(localToggle, isActive, location);

  const toggle = () => {
    setLocalToggle(encodeNavGroupToggle(open ? NAV_GROUP_FOLDED : NAV_GROUP_OPEN, location));
  };

  const listId = `nav-group-${storageKey}`;

  return (
    <div>
      <div className="relative">
        {parent}
        {/* Overlaid on the link's right edge rather than restructuring the
            link into a flex row — NavLink stays untouched. Hidden at the icon
            rail, where the sub-lists are hidden anyway. */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${open ? "Fold" : "Unfold"} ${label} submenu`}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-data-[collapsed=true]/sidebar:hidden"
        >
          <ChevronDown
            aria-hidden
            className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
          />
        </button>
      </div>
      {/* Conditionally shown rather than unmounted-and-refetched: the sub-list
          was already rendered on the server; `hidden` keeps it in the DOM so
          aria-controls always points at a real element. */}
      <div id={listId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
