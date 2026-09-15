import { GatewayLogsSkeleton } from "@/modules/gateway-logs/components/gateway-logs-skeleton";
import { UsageCreditsSkeleton } from "@/modules/gateway-quota/components/usage-credits";

export default function UsageLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <div aria-hidden className="mb-8 h-5 w-36 animate-pulse rounded bg-muted" />
      <div className="space-y-8">
        <div className="space-y-3">
          <div aria-hidden className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div aria-hidden className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
          <div aria-hidden className="h-4 w-full max-w-[52ch] animate-pulse rounded bg-muted/70" />
        </div>
        <UsageCreditsSkeleton />
        <GatewayLogsSkeleton />
      </div>
    </div>
  );
}
