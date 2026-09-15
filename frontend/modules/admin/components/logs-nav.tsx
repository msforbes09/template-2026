"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  visibleLogLinks,
  type LogNavPermissions,
} from "@/modules/admin/lib/log-nav-links";

// Matches UsersStatusNav's treatment exactly — same indent, same left rule,
// same active styling. The difference is that each child here is its own page
// rather than a filter of the parent's, and the set is gated per-permission:
// an admin holding only audit-logs-view sees one child.
function linkClassName(isActive: boolean) {
  return cn(
    "block rounded-lg px-2.5 py-1 text-sm transition-colors",
    isActive
      ? "font-semibold text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function LogsNav({
  logs,
  onNavigate,
}: {
  logs: LogNavPermissions;
  onNavigate?: () => void;
}) {
  // Only the pathname is needed, not searchParams — so unlike UsersStatusNav
  // this doesn't have to sit behind its own Suspense boundary.
  const pathname = usePathname();
  const links = visibleLogLinks(logs);

  if (links.length === 0) return null;

  return (
    <ul className="ml-7 space-y-0.5 border-l border-border pl-3">
      {links.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={pathname === href ? "page" : undefined}
            className={linkClassName(pathname === href)}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
