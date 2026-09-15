import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";
import { getAdminEgovEvent } from "@/modules/egov-events/actions/egov-event-actions";
import { EditEgovEventForm } from "@/modules/egov-events/components/edit-egov-event-form";
import { EgovEventDetails } from "@/modules/egov-events/components/egov-event-details";

export const metadata: Metadata = {
  // Neutral: this route adapts to the admin's permission — the form for
  // egov-events-manage, a read-only view without it.
  title: "Event",
  robots: { index: false, follow: false },
};

// Admin routes bind by numeric id — events carry no uuid, deliberately, since
// there is nothing sensitive in them. The public browses by slug instead.
async function EditEgovEventSection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  // The list hides Edit without egov-events-manage, but the URL is
  // guessable — a view-only admin landing here gets the read-only view
  // instead of a form that would only 403 on submit.
  const [canManage, result] = await Promise.all([
    adminCan(PERMISSIONS.egovEventsManage),
    getAdminEgovEvent(numericId),
  ]);

  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <>
        <PageHeader title="Event" />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load this event"
          description={result.message}
        />
      </>
    );
  }

  if (!canManage) {
    return (
      <>
        <PageHeader
          title="Event"
          description="Read-only — editing needs the egov-events-manage permission."
        />
        <EgovEventDetails event={result.data} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit event"
        description="Renaming an event regenerates its public address, so existing links to it will stop working."
      />
      <EditEgovEventForm event={result.data} />
    </>
  );
}

function EditEventSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
      </div>
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

export default function EditEgovEventPage({ params }: { params: Promise<{ id: string }> }) {
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
      {/* The PageHeader lives inside the Suspense boundary because its title
          depends on the permission check ("Edit event" vs read-only "Event"). */}
      <Suspense fallback={<EditEventSkeleton />}>
        <EditEgovEventSection params={params} />
      </Suspense>
    </div>
  );
}
