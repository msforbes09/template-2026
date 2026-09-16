"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { settingsLinks } from "@/modules/admin/lib/nav-sections";

// The Settings group's indented children — AccessControlNav's treatment
// exactly: each child is its own page, System Controls is gated, and pathname
// alone decides the highlight.
function linkClassName(isActive: boolean) {
  return cn(
    "block rounded-lg px-2.5 py-1 text-sm transition-colors",
    isActive
      ? "font-semibold text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function SettingsNav({
  canManageFeatureFlags,
  onNavigate,
}: {
  canManageFeatureFlags: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = settingsLinks(canManageFeatureFlags);

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
