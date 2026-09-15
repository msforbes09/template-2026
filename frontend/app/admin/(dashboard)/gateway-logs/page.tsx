import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { AdminGatewayLogsList } from "@/modules/gateway-logs/components/admin-gateway-logs-list";
import { LiveUsageChart } from "@/modules/gateway-usage/components/live-usage-chart";
import { GatewayLogsSkeleton } from "@/modules/gateway-logs/components/gateway-logs-skeleton";

export const metadata: Metadata = {
  title: "Gateway Logs",
  robots: { index: false, follow: false },
};

type GatewayLogsSearchParams = Promise<{
  platform?: string;
  status_code?: string;
  from?: string;
  to?: string;
  page?: string;
  // Scopes the list to one citizen (their uuid) — linked from the users list.
  user?: string;
}>;

// The live trace above the list, scoped to the same platform/user filters so
// the chart and the rows never describe different slices. Its own boundary:
// the socket setup must not hold the list back.
async function LiveTraceForParams({ searchParams }: { searchParams: GatewayLogsSearchParams }) {
  const { platform = "", user = "" } = await searchParams;
  return (
    <LiveUsageChart
      audience="admin"
      channel="administrators"
      platform={platform}
      userUuid={user || null}
      height="h-40 sm:h-48"
    />
  );
}

// Reads the searchParams promise itself, kept out of the page component so
// awaiting it doesn't push the static PageHeader behind loading.tsx too.
async function GatewayLogsForParams({ searchParams }: { searchParams: GatewayLogsSearchParams }) {
  const {
    platform = "",
    status_code: statusCode = "",
    from = "",
    to = "",
    page = "1",
    user = "",
  } = await searchParams;
  return (
    <AdminGatewayLogsList
      platform={platform}
      statusCode={statusCode}
      from={from}
      to={to}
      page={page}
      userUuid={user || undefined}
    />
  );
}

export default function GatewayLogsPage({
  searchParams,
}: {
  searchParams: GatewayLogsSearchParams;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gateway Logs"
        description="Read-only record of partner API calls across every month."
      />
      <Suspense fallback={null}>
        <LiveTraceForParams searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<GatewayLogsSkeleton />}>
        <GatewayLogsForParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
