"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/modules/site/components/site-footer";
import { ASSISTANT_PAGE_PATH } from "@/modules/assistant/lib/assistant-page-path";

// The dashboard is an app shell, not a marketing page — the mega footer
// (newsletter/link columns/legal marks) doesn't belong there. Client-only
// because the pathname isn't available to the shared (site) layout, a
// Server Component.
//
// The assistant page is excluded for a different reason: it fills the window
// on purpose, so a footer below it would either be unreachable or push the
// composer off screen.
export function ConditionalSiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  if (pathname === ASSISTANT_PAGE_PATH) return null;
  return <SiteFooter />;
}
