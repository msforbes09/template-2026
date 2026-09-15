import type { Metadata } from "next";
import { Suspense } from "react";
import { Activity, LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BrowsePublicCatalogsButton } from "@/modules/site/components/browse-public-catalogs-button";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeveloperTabs } from "@/modules/site/components/developer-tabs";
import {
  DeveloperAccess,
  DeveloperAccessSkeleton,
} from "@/modules/site/components/developer-access";
import { ClientGatewayLogsList } from "@/modules/gateway-logs/components/client-gateway-logs-list";
import { GatewayLogsSkeleton } from "@/modules/gateway-logs/components/gateway-logs-skeleton";
import {
  UsageCredits,
  UsageCreditsSkeleton,
} from "@/modules/gateway-quota/components/usage-credits";
import { ClientLiveUsage } from "@/modules/gateway-usage/components/client-live-usage";

export const metadata: Metadata = {
  title: "Developers",
  robots: { index: false, follow: false },
};

// `tab` picks the panel; the rest belong to the usage log's filters and are
// awaited inside its own boundary, never here.
type DeveloperSearchParams = Promise<{
  tab?: string | string[];
  platform?: string | string[];
  status_code?: string | string[];
  from?: string | string[];
  to?: string | string[];
  page?: string | string[];
}>;

// Both helpers below await searchParams INSIDE their own Suspense boundary.
// Doing it in the page component would defer the whole shell, tabs included,
// behind loading.tsx on every filter or page change.

// Scoped to the same ?platform= the list is filtered by, so the live trace and
// the rows beneath it never describe different slices.
async function LiveUsageForParams({ searchParams }: { searchParams: DeveloperSearchParams }) {
  const raw = await searchParams;
  const platform = Array.isArray(raw.platform) ? raw.platform[0] : raw.platform;
  return <ClientLiveUsage platform={platform ?? ""} height="h-40 sm:h-48" />;
}

async function UsageListForParams({ searchParams }: { searchParams: DeveloperSearchParams }) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? "";

  return (
    <ClientGatewayLogsList
      platform={first(raw.platform)}
      statusCode={first(raw.status_code)}
      from={first(raw.from)}
      to={first(raw.to)}
      page={first(raw.page) || "1"}
    />
  );
}

export default function DevelopersPage({
  searchParams,
}: {
  searchParams: DeveloperSearchParams;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader
        title="Developers"
        description="The services this account can integrate with, and the calls it has made against them."
        action={
          /* Shown only to accounts still locked out of the real catalog —
              a developer has it right below. Account-gated, so it reads the
              profile in its own boundary; no fallback, a control that may
              not exist shouldn't flash a placeholder. */
          <Suspense fallback={null}>
            <BrowsePublicCatalogsButton />
          </Suspense>
        }
      />

      <DeveloperTabs>
        <TabsList variant="line" className="w-full justify-start gap-6 p-0">
          <TabsTrigger value="catalog" className="flex-none gap-1.5 px-0.5">
            <LayoutGrid aria-hidden className="size-3.5" />
            API catalog
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex-none gap-1.5 px-0.5">
            <Activity aria-hidden className="size-3.5" />
            Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="pt-6" keepMounted>
          <Suspense fallback={<DeveloperAccessSkeleton />}>
            <DeveloperAccess />
          </Suspense>
        </TabsContent>

        {/* Deliberately NOT keepMounted, unlike its sibling: the usage list
            opens a Reverb subscription for the live tail, and a reader who
            never touches this tab should not be paying for a websocket. The
            rows are in the RSC payload either way, so selecting it is still
            instant. Same reasoning as the catalog show route's Usage tab. */}
        <TabsContent value="usage" className="pt-6">
          <div className="space-y-8">
            <Suspense fallback={<UsageCreditsSkeleton />}>
              <UsageCredits />
            </Suspense>
            {/* Above the log: what is arriving now, over the record of what
                already did. Its own boundary so the socket setup never holds
                the list back. */}
            <Suspense fallback={null}>
              <LiveUsageForParams searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={<GatewayLogsSkeleton />}>
              <UsageListForParams searchParams={searchParams} />
            </Suspense>
          </div>
        </TabsContent>
      </DeveloperTabs>
    </div>
  );
}
