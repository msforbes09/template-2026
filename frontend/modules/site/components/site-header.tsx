import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { SiteHeaderAuthArea } from "@/modules/site/components/site-header-auth-area";
import { SiteHeaderNavArea } from "@/modules/site/components/site-header-nav-area";

// Ported from design-study/light.html — logo lockup + minimal nav + a tricolor
// hairline. Auth stays session-aware via SiteHeaderAuthArea (Suspense). Nav
// links swap to the dashboard set inside /dashboard — see SiteHeaderNav.

function SiteHeaderAuthAreaSkeleton() {
  return <div aria-hidden className="h-9 w-40 animate-pulse rounded-lg bg-muted" />;
}

// Matches SiteHeaderNav's dimensions (3 desktop nav links + auth area +
// mobile menu button) — shown only while usePathname() needs a Suspense
// boundary under cacheComponents (dynamic-param routes' prerender pass).
function SiteHeaderNavSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden className="hidden items-center gap-10 lg:flex">
        <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
      </div>
      <div aria-hidden className="hidden h-9 w-40 animate-pulse rounded-lg bg-muted lg:block" />
      <div aria-hidden className="h-10 w-10 animate-pulse rounded-lg bg-muted lg:hidden" />
    </div>
  );
}

export function SiteHeader() {
  // Two renders, not one node reused: the header slot gets the dropdown
  // account menu and the mobile panel gets flat links (see
  // SiteHeaderAuthArea's variant note). getClientProfile is cache()-memoized
  // per request, so this is still one profile fetch.
  const authArea = (
    <Suspense fallback={<SiteHeaderAuthAreaSkeleton />}>
      <SiteHeaderAuthArea />
    </Suspense>
  );
  const mobileAuthArea = (
    <Suspense fallback={<SiteHeaderAuthAreaSkeleton />}>
      <SiteHeaderAuthArea variant="stacked" />
    </Suspense>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div
        aria-hidden
        className="h-0.5 bg-gradient-to-r from-primary via-destructive to-sun"
      />
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 py-4 sm:px-9 lg:px-16">
        <Link href="/" className="flex items-center" aria-label="eGov API, home">
          <Logo className="h-7 w-auto" />
        </Link>

        <Suspense fallback={<SiteHeaderNavSkeleton />}>
          <SiteHeaderNavArea authArea={authArea} mobileAuthArea={mobileAuthArea} />
        </Suspense>
      </div>
    </header>
  );
}
