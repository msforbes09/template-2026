"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// One entry per lifecycle status. The wording answers "which accounts?"
// (Incomplete, Completed); the table badge answers "what state is this one
// in?" with the raw status label.
const USER_STATUS_LINKS = [
  { href: "/admin/users?status=draft", label: "Incomplete" },
  { href: "/admin/users?status=completed", label: "Completed" },
] as const;

function linkClassName(isActive: boolean) {
  return cn(
    "block rounded-lg px-2.5 py-1 text-sm transition-colors",
    isActive
      ? "font-semibold text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function UsersStatusNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const current =
    pathname === "/admin/users" && status ? `/admin/users?status=${status}` : null;

  return (
    <ul className="ml-7 space-y-0.5 border-l border-border pl-3">
      {USER_STATUS_LINKS.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={current === href ? "page" : undefined}
            className={linkClassName(current === href)}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Suspense fallback for the searchParams-dependent version above — same real,
// working links, just without the active-status highlight computed yet.
export function UsersStatusNavFallback({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="ml-7 space-y-0.5 border-l border-border pl-3">
      {USER_STATUS_LINKS.map(({ href, label }) => (
        <li key={href}>
          <Link href={href} onClick={onNavigate} className={linkClassName(false)}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
