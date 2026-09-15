"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceModal } from "@/components/ui/resource-modal";
import { GatewayLogDetailBody } from "@/modules/gateway-logs/components/gateway-log-detail";
import {
  getGatewayLog,
  getUserGatewayLog,
} from "@/modules/gateway-logs/actions/admin-gateway-log-actions";
import { getMyGatewayLog } from "@/modules/gateway-logs/actions/client-gateway-log-actions";
import { formatLogTimestamp } from "@/lib/log-date";
import type { AdminGatewayLogDetail, GatewayLogDetail, GatewayLogListItem } from "@/types/gateway-log";

// Which audience's show endpoint to call. "admin" hits the global show unless
// the list is scoped to a citizen (`userUuid`), in which case the per-user
// show is used so a log that isn't theirs stays a 404.
export type GatewayLogAudience = "admin" | "client";

function DetailSkeleton() {
  return (
    <div aria-hidden className="space-y-5">
      <div className="flex gap-2">
        <div className="h-5 w-14 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-12 animate-pulse rounded-4xl bg-muted" />
      </div>
      <div className="h-9 w-full animate-pulse rounded-lg bg-muted/60" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted/70" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-32 w-full animate-pulse rounded-xl bg-muted/40" />
    </div>
  );
}

export function ViewGatewayLogModal({
  log,
  audience,
  userUuid,
}: {
  // `log.id` is the opaque composite id and carries its own month, so nothing
  // about the list's filter has to travel with it any more.
  log: GatewayLogListItem;
  audience: GatewayLogAudience;
  userUuid?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<GatewayLogDetail | AdminGatewayLogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scope the list to the clicked caller — only offered on the admin list
  // when it isn't user-scoped yet. Keeps the other filters (platform, status,
  // date range) since the user scope is orthogonal to them (the clear-filters
  // button likewise keeps `user`), and resets to page 1 for the new scope.
  const filterByCaller =
    audience === "admin" && !userUuid
      ? (uuid: string) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("user", uuid);
          params.delete("page");
          setOpen(false);
          router.push(`/admin/gateway-logs?${params.toString()}`);
        }
      : undefined;

  function load() {
    setDetail(null);
    setError(null);

    const request =
      audience === "client"
        ? getMyGatewayLog(log.id)
        : userUuid
          ? getUserGatewayLog(userUuid, log.id)
          : getGatewayLog(log.id);

    request.then((result) => {
      if (result.ok) {
        setDetail(result.data);
        return;
      }
      if (result.status === 401) {
        setOpen(false);
        // The citizen sign-in destination depends on a server-only env var
        // (which of the two auth methods is active), so the redirect is left
        // to the page's own session guard on the next render.
        if (audience === "admin") router.push("/admin/login");
        else router.refresh();
        return;
      }
      setError(
        result.status === 404 ? "This log is no longer available." : result.message,
      );
    });
  }

  return (
    <ResourceModal
      open={open}
      onOpenChange={setOpen}
      onOpen={load}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`View ${log.method} ${log.url} request details`}
        >
          <Eye aria-hidden className="size-4" />
        </Button>
      }
      title="Request Details"
      description={formatLogTimestamp(log.requested_at)}
      contentClassName="sm:max-w-2xl"
    >
      {error ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load this log" description={error} />
      ) : detail ? (
        <GatewayLogDetailBody log={detail} onFilterByCaller={filterByCaller} />
      ) : (
        <DetailSkeleton />
      )}
    </ResourceModal>
  );
}
