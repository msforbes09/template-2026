"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileMenu } from "@/modules/site/components/mobile-menu";

type NavLink = { href: string; label: string };

const MARKETING_LINKS: NavLink[] = [
  { href: "/#catalog", label: "Services" },
  // A real page rather than a landing-page anchor, so it also works as the
  // destination from the hackathon section further down the landing page.
  { href: "/projects", label: "Projects" },
  { href: "/#access", label: "Access" },
  { href: "/faqs", label: "FAQs" },
];

const DASHBOARD_LINKS: NavLink[] = [
  // "Dashboard", not "Home": the site's own home is the landing page one
  // click away on the logo, so "Home" in this set named the wrong thing.
  { href: "/dashboard", label: "Dashboard" },
  // "My Projects", not "Projects": the marketing nav above uses "Projects"
  // for the PUBLIC showcase, and the header swaps between the two sets on the
  // same row, so an identical label pointed at a different page read as the
  // same destination behaving inconsistently. Matches the destination's own
  // page title exactly, which is the signal that you arrived where you meant.
  { href: "/dashboard/projects", label: "My Projects" },
  // The service catalogue, credentials and the usage log — all of it, since
  // Usage became a tab here rather than its own route. No separate Usage
  // entry: it would point at the same page this one does, and clicking it
  // while already here changes only a query param, which a client navigation
  // does not reliably surface to the tab strip. The tabs are the control.
  { href: "/dashboard/developers", label: "Developers" },
  { href: "/dashboard/profile", label: "Profile" },
];

const NAV_LINK_CLASS =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-primary";

// Swaps the header's nav links (and the footer, see ConditionalSiteFooter)
// once the citizen is inside the dashboard — the marketing anchor links
// (#catalog/#access) only exist on the landing page, so they'd 404 there
// anyway. Client-only because the pathname isn't available to the shared
// (site) layout/SiteHeader Server Components.
export function SiteHeaderNav({
  authArea,
  // The mobile panel gets its own render of the auth area — a dropdown can't
  // survive inside MobileMenu, which closes on any click within it.
  mobileAuthArea,
  isAuthenticated = false,
}: {
  authArea: React.ReactNode;
  mobileAuthArea: React.ReactNode;
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  const inDashboard = pathname.startsWith("/dashboard");
  // On the public pages a signed-in citizen gets a way back to their
  // dashboard, FIRST in the row: for someone with an account it is the
  // destination, and the marketing links after it are the browsing. It also
  // then sits in the same position as the dashboard nav's own first entry, so
  // the link does not appear to move as you cross between the two sets.
  const links = inDashboard
    ? DASHBOARD_LINKS
    : isAuthenticated
      ? [{ href: "/dashboard", label: "Dashboard" }, ...MARKETING_LINKS]
      : MARKETING_LINKS;

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={NAV_LINK_CLASS}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="hidden items-center gap-3 lg:flex">{authArea}</div>
      <MobileMenu links={links} authArea={mobileAuthArea} />
    </>
  );
}
