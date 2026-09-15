"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { accessControlLinks, type NavSectionPermissions } from "@/modules/admin/lib/nav-sections";

// The Access Control group's indented children — LogsNav's treatment exactly:
// each child is its own page, the set is gated per permission, and pathname
// alone decides the highlight (no searchParams, so no Suspense needed).
function linkClassName(isActive: boolean) {
  return cn(
    "block rounded-lg px-2.5 py-1 text-sm transition-colors",
    isActive
      ? "font-semibold text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function AccessControlNav({
  sections,
  onNavigate,
}: {
  sections: NavSectionPermissions;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = accessControlLinks(sections);

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
