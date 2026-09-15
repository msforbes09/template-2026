"use client";

import { useMemo } from "react";
import { Radio, ScrollText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNumber } from "@/lib/format-number";
import { GatewayLogsTable } from "@/modules/gateway-logs/components/gateway-logs-table";
import { useGatewayLogFeed } from "@/modules/gateway-logs/lib/use-gateway-log-feed";
import type { EchoAudience } from "@/lib/echo-client";
import type { GatewayLogListItem } from "@/types/gateway-log";

// The list region of a gateway-logs screen, with the live tail attached.
//
// This owns the one subscription for the screen and renders both things that
// consume it — the counts strip and the rows — so there's no second listener
// on the same channel to keep in sync.
//
// The REST page stays the source of truth: it has the history and the paging,
// and it's what a reconnect refetches. Live rows only ever sit on top of it.
export function GatewayLogsFeed({
  logs,
  audience,
  userUuid,
  channel,
  platform,
  append,
  enabled,
  initialTotal,
  emptyTitle,
  emptyDescription,
  platformFilterable = true,
}: {
  // The current REST page, newest first.
  logs: GatewayLogListItem[];
  audience: EchoAudience;
  // Admin per-user scope — filters the shared feed and scopes row links.
  userUuid?: string;
  channel: string;
  platform: string;
  // Live rows are only shown where they belong: the newest page of a view
  // whose date range includes today. Decided server-side (the browser clock
  // isn't the authority on what "today" is) and passed down.
  append: boolean;
  enabled: boolean;
  // The paginator's meta.total for the current filter — the baseline the live
  // count adds to.
  initialTotal: number;
  emptyTitle: string;
  emptyDescription: string;
  // Off where the platform is pinned (per-catalog tab).
  platformFilterable?: boolean;
}) {
  const { rows, received, ratePerMinute, status } = useGatewayLogFeed({
    audience,
    channel,
    platform,
    userUuid,
    append,
    enabled,
  });

  // Live rows the REST page doesn't already carry. After a reconnect refetch
  // the same log is in both, and the server copy is the canonical one.
  const merged = useMemo(() => {
    if (rows.length === 0) return logs;
    const known = new Set(logs.map((log) => log.id));
    const fresh = rows.filter((row) => !known.has(row.id));
    return fresh.length === 0 ? logs : [...fresh, ...logs];
  }, [rows, logs]);

  return (
    <div className="space-y-4">
      {enabled && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Radio aria-hidden className="size-4 text-muted-foreground" />
            <StatusBadge
              active={status === "connected"}
              activeLabel="Live"
              inactiveLabel={
                status === "connecting" || status === "reconnecting"
                  ? "Connecting…"
                  : "Disconnected"
              }
            />
          </div>
          {/* aria-live so a screen reader hears the totals move without
              having to poll the region. */}
          <dl aria-live="polite" className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">Calls</dt>
              <dd className="font-semibold tabular-nums">
                {formatNumber(initialTotal + received)}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-muted-foreground">Last minute</dt>
              <dd className="font-semibold tabular-nums">{formatNumber(ratePerMinute)}</dd>
            </div>
            {received > 0 && (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-muted-foreground">New since you opened this</dt>
                <dd className="font-semibold tabular-nums text-primary">
                  {formatNumber(received)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {merged.length === 0 ? (
        <EmptyState icon={ScrollText} title={emptyTitle} description={emptyDescription} />
      ) : (
        <GatewayLogsTable
          logs={merged}
          audience={audience}
          userUuid={userUuid}
          platformFilterable={platformFilterable}
        />
      )}
    </div>
  );
}
