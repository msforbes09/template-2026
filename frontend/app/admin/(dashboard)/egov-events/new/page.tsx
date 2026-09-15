import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { CreateEgovEventForm } from "@/modules/egov-events/components/create-egov-event-form";

export const metadata: Metadata = {
  title: "New event",
  robots: { index: false, follow: false },
};

// The list hides New event without egov-events-manage, but the URL is
// guessable — gate here too so a view-only admin gets a clear denial rather
// than a form that would only 403 on submit.
async function NewEgovEventSection() {
  const canManage = await adminCan(PERMISSIONS.egovEventsManage);

  if (!canManage) {
    return (
      <EmptyState
        icon={ShieldX}
        title="You can't create events"
        description="Ask an administrator to grant you the egov-events-manage permission."
      />
    );
  }

  return <CreateEgovEventForm />;
}

function NewEventSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="space-y-1.5">
          <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
          <div className="h-9 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
      <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
    </div>
  );
}

export default function NewEgovEventPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/egov-events"
        className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        eGov Events
      </Link>
      <PageHeader
        title="New event"
        description="Its public address is generated from the name, so pick one you can live with."
      />
      <Suspense fallback={<NewEventSkeleton />}>
        <NewEgovEventSection />
      </Suspense>
    </div>
  );
}
