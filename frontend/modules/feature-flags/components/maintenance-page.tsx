import { Wrench } from "lucide-react";
import {
  MAINTENANCE_HINT,
  MAINTENANCE_MESSAGE,
  MAINTENANCE_TITLE,
} from "@/lib/maintenance";

// The full-page takeover shown while `maintenance_mode` is on, for both the
// user portal and the public site (they share the `(site)` shell).
//
// A takeover rather than a banner, per the handoff: while maintenance is on,
// every user/* endpoint is down — login and registration included — plus the
// public project and event catalogue. Leaving the chrome up would offer a
// header full of links that all fail.
//
// No "retry" button. Retrying is what reloading the page already does, and a
// button that re-renders a page that will render the same thing is worse than
// the plain sentence telling someone to come back.
export function MaintenancePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <Wrench className="size-7" />
        </span>

        {/* The page's only h1: this replaces the whole document, so nothing
            else is competing for the top of the outline. */}
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{MAINTENANCE_TITLE}</h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {MAINTENANCE_MESSAGE}
        </p>
        <p className="mt-4 text-sm font-medium">{MAINTENANCE_HINT}</p>
      </div>
    </main>
  );
}
