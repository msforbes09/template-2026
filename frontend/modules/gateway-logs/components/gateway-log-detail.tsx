import { Badge } from "@/components/ui/badge";
import {
  DetailField,
  DetailGrid,
  JsonSection,
} from "@/components/ui/detail-list";
import { MethodBadge } from "@/modules/api-docs/components/method-badge";
import { GatewayStatusBadge } from "@/modules/gateway-logs/components/gateway-status-badge";
import { PlatformBadge } from "@/modules/gateway-logs/components/platform-badge";
import { formatLogTimestamp } from "@/lib/log-date";
import { formatNumber } from "@/lib/format-number";
import type { AdminGatewayLogDetail, GatewayLogDetail } from "@/types/gateway-log";

function durationLabel(ms: number | null): string {
  return ms == null ? "—" : `${formatNumber(ms)} ms`;
}

// Shared body for both detailed shows. The citizen's shape omits
// `connection_duration_ms` and the caller entirely (deliberately — a citizen
// isn't shown that their call was proxied to a partner), so the admin-only
// fields render only when they're actually present.
//
// `onFilterByCaller` makes the caller's name a link-styled button (admin,
// unscoped list only — the modal decides); absent, the name is plain text.
export function GatewayLogDetailBody({
  log,
  onFilterByCaller,
}: {
  log: GatewayLogDetail | AdminGatewayLogDetail;
  onFilterByCaller?: (uuid: string) => void;
}) {
  const admin = log as AdminGatewayLogDetail;
  const caller = admin.user;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={log.method} />
        <GatewayStatusBadge statusCode={log.status_code} />
        <PlatformBadge platform={log.platform} />
      </div>

      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs break-all">
        {log.url}
      </p>

      <DetailGrid>
        <DetailField label="Requested At">{formatLogTimestamp(log.requested_at)}</DetailField>
        <DetailField label="Duration">{durationLabel(log.gateway_duration_ms)}</DetailField>
        {"connection_duration_ms" in log && (
          <DetailField label="Partner Round-Trip">
            {durationLabel(admin.connection_duration_ms)}
          </DetailField>
        )}
        <DetailField label="IP Address">{log.ip_address ?? "—"}</DetailField>
        {caller && (
          <>
            <DetailField label="Caller">
              {onFilterByCaller ? (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  render={
                    <button
                      type="button"
                      onClick={() => onFilterByCaller(caller.uuid)}
                      aria-label={`Show only calls made by ${caller.display_name}`}
                    />
                  }
                >
                  {caller.display_name}
                </Badge>
              ) : (
                caller.display_name
              )}
            </DetailField>
            <DetailField label="Caller Contact">
              {caller.email ?? caller.mobile_number ?? "—"}
            </DetailField>
          </>
        )}
      </DetailGrid>

      <div className="space-y-3">
        <JsonSection label="Request Headers" blob={log.headers} />
        <JsonSection label="Query Parameters" blob={log.params} />
        <JsonSection label="Request Payload" blob={log.payload} />
        <JsonSection label="Response" blob={log.response} />
      </div>

      <p className="text-xs text-muted-foreground">
        Sensitive values in the payload, response and headers are masked before
        they are stored.
      </p>
    </div>
  );
}
