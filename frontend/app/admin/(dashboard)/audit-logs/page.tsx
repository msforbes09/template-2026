import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogsList } from "@/modules/admin-logs/components/audit-logs-list";
import { AdminLogsSkeleton } from "@/modules/admin-logs/components/admin-logs-states";

export const metadata: Metadata = {
  title: "Audit Logs",
  robots: { index: false, follow: false },
};

type AuditLogsSearchParams = Promise<{
  event?: string;
  auditable_type?: string;
  auditable_id?: string;
  user_type?: string;
  user_id?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

// Reads the searchParams promise itself, kept out of the page component so
// awaiting it doesn't push the static PageHeader behind loading.tsx too.
async function AuditLogsForParams({ searchParams }: { searchParams: AuditLogsSearchParams }) {
  const {
    event = "",
    auditable_type: auditableType = "",
    auditable_id: auditableId = "",
    user_type: userType = "",
    user_id: userId = "",
    from = "",
    to = "",
    page = "1",
  } = await searchParams;
  return (
    <AuditLogsList
      event={event}
      auditableType={auditableType}
      auditableId={auditableId}
      userType={userType}
      userId={userId}
      from={from}
      to={to}
      page={page}
    />
  );
}

export default function AuditLogsPage({
  searchParams,
}: {
  searchParams: AuditLogsSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Logs"
        description="Read-only change trail across the platform, including gateway credential mint and revoke."
      />
      <Suspense fallback={<AdminLogsSkeleton filters={5} />}>
        <AuditLogsForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
