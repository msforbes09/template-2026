"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ADMIN_PROJECT_MENU_LINKS,
  isProjectMenuActive,
} from "@/modules/projects/lib/admin-project-menu";

// One entry per admin QUEUE — mostly a lifecycle status, but Published and
// Hidden split the approved ones by visibility and Pending Changes gathers
// the live projects whose updates are still in a review lane. The definitions
// (and the highlight rule) live in admin-project-menu.ts so the menu, the
// badges and the list filters can't drift apart.
//
// No "All Projects" entry, matching Users: the parent NavLink above already
// points at the unfiltered list, so a child saying the same thing would be
// the one entry in the group that isn't a queue.

function linkClassName(isActive: boolean) {
  return cn(
    "block rounded-lg px-2.5 py-1 text-sm transition-colors",
    isActive
      ? "font-semibold text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function ProjectsStatusNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Only highlights on the list itself — a project's own detail page lives
  // under /admin/projects/{uuid} and belongs to no single queue. An
  // unfiltered list highlights nothing here; the parent link is the active
  // one, same as Users.
  const search = pathname === "/admin/projects" ? searchParams.toString() : "";

  return (
    <ul className="ml-7 space-y-0.5 border-l border-border pl-3">
      {ADMIN_PROJECT_MENU_LINKS.map(({ label, query }) => {
        const isActive = search !== "" && isProjectMenuActive(search, query);
        return (
          <li key={label}>
            <Link
              href={`/admin/projects?${query}`}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={linkClassName(isActive)}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Suspense fallback for the searchParams-dependent version above — the same
// real, working links, just without the active highlight resolved yet.
export function ProjectsStatusNavFallback({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="ml-7 space-y-0.5 border-l border-border pl-3">
      {ADMIN_PROJECT_MENU_LINKS.map(({ label, query }) => (
        <li key={label}>
          <Link
            href={`/admin/projects?${query}`}
            onClick={onNavigate}
            className={linkClassName(false)}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
