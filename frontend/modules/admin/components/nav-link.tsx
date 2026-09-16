"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/modules/admin/lib/nav-active";

export function NavLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = isNavActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
        // Collapsed to the icon rail. The variants match nothing outside the
        // desktop sidebar's `group/sidebar`, so the mobile Sheet — which
        // renders this same component — is untouched.
        "group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:gap-0 group-data-[collapsed=true]/sidebar:px-0",
        isActive
          ? "border-primary/30 bg-background font-semibold text-primary shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          : "border-transparent font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      {/* sr-only, never hidden: display:none would drop the label out of the
          accessibility tree and leave the link with no accessible name at all,
          since the icon beside it is aria-hidden. */}
      <span className="min-w-0 truncate group-data-[collapsed=true]/sidebar:sr-only">
        {children}
      </span>
    </Link>
  );
}
