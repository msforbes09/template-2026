import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ConnectionLogsList } from "@/modules/admin-logs/components/connection-logs-list";
import { AdminLogsSkeleton } from "@/modules/admin-logs/components/admin-logs-states";

export const metadata: Metadata = {
  title: "Connection Logs",
  robots: { index: false, follow: false },
};

type ConnectionLogsSearchParams = Promise<{
  type?: string;
  status_code?: string;
  reference?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

// Reads the searchParams promise itself, kept out of the page component so
// awaiting it doesn't push the static PageHeader behind loading.tsx too.
async function ConnectionLogsForParams({
  searchParams,
}: {
  searchParams: ConnectionLogsSearchParams;
}) {
  const {
    type = "",
    status_code: statusCode = "",
    reference = "",
    from = "",
    to = "",
    page = "1",
  } = await searchParams;
  return (
    <ConnectionLogsList
      type={type}
      statusCode={statusCode}
      reference={reference}
      from={from}
      to={to}
      page={page}
    />
  );
}

export default function ConnectionLogsPage({
  searchParams,
}: {
  searchParams: ConnectionLogsSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Connection Logs"
        description="Read-only record of outbound calls the gateway makes to partner services."
      />
      <Suspense fallback={<AdminLogsSkeleton filters={3} />}>
        <ConnectionLogsForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
