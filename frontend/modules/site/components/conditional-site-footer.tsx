"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/modules/site/components/site-footer";

// The dashboard is an app shell, not a marketing page — the mega footer
// (newsletter/link columns/legal marks) doesn't belong there. Client-only
// because the pathname isn't available to the shared (site) layout, a
// Server Component.
export function ConditionalSiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  return <SiteFooter />;
}
