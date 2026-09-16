"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADMIN_SIDEBAR_COLLAPSED_VALUE,
  ADMIN_SIDEBAR_COOKIE,
  ADMIN_SIDEBAR_COOKIE_MAX_AGE,
} from "@/modules/admin/lib/sidebar-preference";

// The desktop sidebar's chrome and its one piece of client state: whether it is
// collapsed to an icon rail, and whether it is momentarily peeked open.
//
// It takes the nav as `children` so the menu stays SERVER-rendered — the
// permission reads behind it, and the async sub-lists inside it, never enter
// the client bundle. Only the width lives here.
//
// Two states, deliberately not one:
//   - `collapsed` is the admin's choice. It persists to a cookie and survives
//     navigation and reload.
//   - `peeking` is transient hover/focus. It widens the panel WITHOUT touching
//     the admin's choice, so following a link drops straight back to the rail.
export function AdminSidebarShell({
  defaultCollapsed,
  children,
}: {
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [peeking, setPeeking] = useState(false);

  // The panel shows labels when it is pinned open OR being peeked.
  const open = !collapsed || peeking;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // A peek in progress is the admin's pointer, not their intent. Clearing it
    // means the toggle always lands on the state its icon promised.
    setPeeking(false);
    // Written straight to document.cookie rather than through a server action:
    // this is a UI preference the API does not own, and a round trip would make
    // the toggle lag the animation it triggers. AdminSidebar reads it back on
    // the next hard load.
    document.cookie = `${ADMIN_SIDEBAR_COOKIE}=${
      next ? ADMIN_SIDEBAR_COLLAPSED_VALUE : "0"
    }; path=/; max-age=${ADMIN_SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  }

  return (
    <aside
      // The <aside> holds the SPACE, the panel inside holds the chrome. A peek
      // grows only the panel, so the flyout covers the content rather than
      // shoving it sideways under the pointer — and the content never reflows
      // for something as incidental as a hover.
      className={cn(
        "relative hidden shrink-0 transition-[width] duration-200 motion-reduce:transition-none lg:block",
        collapsed ? "w-16" : "w-64",
      )}
      onMouseEnter={() => {
        if (collapsed) setPeeking(true);
      }}
      onMouseLeave={() => setPeeking(false)}
      // Focus mirrors hover so the rail is reachable by keyboard: tabbing into
      // it opens the flyout, which is what makes the labels and the nested
      // Users/Projects/Logs lists available at all while collapsed.
      onFocusCapture={() => {
        if (collapsed) setPeeking(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPeeking(false);
      }}
      // "Click a link and it goes back to being collapsed." Delegated rather
      // than wired into every NavLink: the nested sub-lists are separate
      // components and the nav is server-rendered, so there is no callback to
      // hand down. Capture phase, so it still runs if a link stops propagation.
      //
      // The pointer is usually still inside the flyout at this moment, but
      // mouseenter does not re-fire without leaving first — so the rail stays
      // shut instead of springing open again under a stationary cursor.
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest("a")) setPeeking(false);
      }}
    >
      <div
        // The single signal every descendant styles off — NavLink hides its
        // label, the sub-lists hide themselves. A data attribute rather than
        // prop drilling, because it has to cross a server/client boundary that
        // props cannot: this component is client, the nav below it is not.
        data-collapsed={open ? "false" : "true"}
        className={cn(
          "group/sidebar absolute inset-y-0 left-0 flex flex-col border-r border-border bg-sidebar transition-[width] duration-200 motion-reduce:transition-none",
          open ? "w-64" : "w-16",
          // Only a flyout lifts off the page. A pinned sidebar is flush with
          // the content beside it, exactly as before.
          collapsed && peeking && "z-30 shadow-xl",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-1 border-b border-border px-3 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-2">
          {/* sr-only rather than hidden: the rail keeps a route to the
              dashboard for a screen reader even with no room to draw the mark. */}
          <Link
            href="/admin"
            className="flex min-w-0 flex-1 items-center px-1 group-data-[collapsed=true]/sidebar:sr-only"
          >
            <Logo />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0"
          >
            {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
          </Button>
        </div>
        {/* The menu is the sidebar's own scroll container, so the logo bar
            stays level with the header however many entries this admin sees. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </aside>
  );
}
