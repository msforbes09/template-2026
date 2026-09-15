import { GatewayLogsSkeleton } from "@/modules/gateway-logs/components/gateway-logs-skeleton";

export default function GatewayLogsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <GatewayLogsSkeleton />
    </div>
  );
}
