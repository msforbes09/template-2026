"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// One entry per lifecycle status, per the 2026-08-23 handoff. The wording is
// capability-oriented (Incomplete, Basic Access, Developer Access) rather
// than the raw status names the table badge shows — the submenu answers
// "which accounts?", the badge answers "what state is this one in?".
//
// Two statuses are deliberately absent. `approved` is gone because an
// approved user IS a developer — that bucket is the Developer Access entry
// below, and having both would be two names for one set. `pending` is gone
// because it only ever applied to dormant eGov-SSO accounts, and SSO is
// removed, so no website user can reach it.
const USER_STATUS_LINKS = [
  { href: "/admin/users?status=draft", label: "Incomplete" },
  { href: "/admin/users?status=completed", label: "Basic Access" },
  { href: "/admin/users?status=for_assessment", label: "For Assessment" },
  { href: "/admin/users?status=for_resubmission", label: "For Resubmission" },
  // Not a status but a capability, which is why it filters on ?type= and sits
  // on its own axis from the status entries above.
  { href: "/admin/users?type=developer", label: "Developer Access" },
  { href: "/admin/users?status=suspended", label: "Suspended" },
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
  // Compared as a whole query rather than by status alone, so the Developers
  // entry (?type=) highlights on the same rule as the status entries.
  const current =
    pathname === "/admin/users"
      ? `/admin/users?${new URLSearchParams({
          ...(searchParams.get("status") ? { status: searchParams.get("status")! } : {}),
          ...(searchParams.get("type") ? { type: searchParams.get("type")! } : {}),
        }).toString()}`
      : null;

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
// working links (so nothing is unclickable while streaming in), just without
// the active-status highlight computed yet.
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
