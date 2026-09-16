import { Suspense } from "react";
import { AdminSidebar, AdminSidebarSkeleton } from "@/modules/admin/components/admin-sidebar";
import { AdminHeader } from "@/modules/admin/components/admin-header";
import { ForcePasswordChangeGate } from "@/modules/admin/components/force-password-change-gate";

function AdminHeaderSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-4 sm:px-6"
    >
      <div className="size-9 animate-pulse rounded-lg bg-muted lg:hidden" />
      <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // h-dvh + overflow-hidden makes the shell exactly the viewport and stops it
    // scrolling itself. That is what pins the header and the sidebar's logo bar:
    // they are not `position: fixed`, they simply sit outside the two things
    // that DO scroll — the nav and <main> — so nothing overlaps and nothing
    // needs a z-index or a compensating offset.
    <div className="flex h-dvh overflow-hidden">
      <Suspense fallback={<AdminSidebarSkeleton />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<AdminHeaderSkeleton />}>
          <AdminHeader />
        </Suspense>
        {/* min-h-0 because a flex item's default min-height:auto refuses to
            shrink below its content — without it a long page grows the column
            past the viewport and the document takes the scroll back, which is
            exactly what this layout is undoing.

            relative because absolutely-positioned descendants with no closer
            positioned ancestor (Tailwind's sr-only spans, e.g. in the star
            rating) otherwise resolve against the document: they escape this
            scroller, stretch the body below the shell, and the page scrolls
            past the content. Anchoring them here keeps their overflow inside
            the pane that already scrolls. */}
        <main className="relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <Suspense fallback={null}>
        <ForcePasswordChangeGate />
      </Suspense>
    </div>
  );
}
