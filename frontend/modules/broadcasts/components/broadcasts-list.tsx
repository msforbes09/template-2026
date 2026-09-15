import Link from "next/link";
import { Megaphone, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatDate } from "@/lib/format-date";
import { BroadcastBody } from "@/modules/broadcasts/components/broadcast-body";
import { BroadcastStatusBadge } from "@/modules/broadcasts/components/broadcast-status-badge";
import { DeleteBroadcastButton } from "@/modules/broadcasts/components/delete-broadcast-button";
import { StartBroadcastButton } from "@/modules/broadcasts/components/start-broadcast-button";
import { describeAudience } from "@/modules/broadcasts/lib/broadcast-audience";
import { SendingHint } from "@/modules/broadcasts/components/sending-hint";
import { getBroadcasts } from "@/modules/broadcasts/lib/get-broadcasts";
import { getAdminProfile } from "@/modules/admin/lib/get-admin-profile";
import { isBroadcastEditable, isBroadcastOwner } from "@/types/broadcast";

// Broadcast history. Newest first, drafts included, soft-deleted ones gone.
//
// Rows are cards rather than a table: each carries a status, an audience
// sentence, a count and up to three controls, and squeezing that into columns
// made the one thing that matters — who this reaches — the narrowest cell.
//
// Timestamps are Asia/Manila wall-clock strings and are rendered AS-IS. They
// carry no offset, so re-interpreting them in the viewer's zone would shift
// every time shown here by the difference.
export async function BroadcastsList({ page }: { page: string }) {
  const [result, profile] = await Promise.all([getBroadcasts(page), getAdminProfile()]);
  const { data, meta } = result;
  const adminId = profile?.id ?? null;

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Megaphone}
        title="No broadcasts yet"
        description="Compose one to announce maintenance, an incident or programme news to citizens."
        action={
          <Button nativeButton={false} render={<Link href="/admin/broadcasts/new" />}>
            New broadcast
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {data.map((broadcast) => {
          const audience = describeAudience(broadcast.filters);
          // Edit / delete / start are draft-only AND creator-only. The API
          // answers 400 or 403 regardless; this keeps controls that cannot
          // work out of everyone else's way.
          const mine = isBroadcastOwner(broadcast, adminId);
          const actionable = isBroadcastEditable(broadcast) && mine;

          return (
            <li
              key={broadcast.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BroadcastStatusBadge status={broadcast.status} />
                    <h3 className="text-base font-semibold tracking-tight">
                      {broadcast.title}
                    </h3>
                  </div>
                  <BroadcastBody body={broadcast.body} />
                </div>

                {actionable && (
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/admin/broadcasts/${broadcast.id}/edit`} />}
                    >
                      <Pencil data-icon="inline-start" />
                      Edit
                    </Button>
                    <DeleteBroadcastButton id={broadcast.id} title={broadcast.title} />
                    <StartBroadcastButton broadcast={broadcast} />
                  </div>
                )}
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Audience</dt>
                  <dd className="font-medium">{audience.label}</dd>
                  {/* The uuid behind a single-citizen scope — without it the
                      history says a broadcast was narrow but not at whom. */}
                  {audience.detail && (
                    <dd className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {audience.detail}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Recipients</dt>
                  <dd className="font-medium tabular-nums">
                    {broadcast.recipients_count ?? "—"}
                  </dd>
                </div>
                {/* One delivery timestamp, not two: once the fan-out has
                    finished, "Sent" (completed_at) is the moment that
                    matters, and Started — seconds earlier — only earns its
                    place while the broadcast is still sending. */}
                {broadcast.completed_at ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Sent</dt>
                    <dd className="font-medium">
                      {formatDate(broadcast.completed_at, "d MMM yyyy, h:mm a")}
                    </dd>
                  </div>
                ) : broadcast.started_at ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Started</dt>
                    <dd className="font-medium">
                      {formatDate(broadcast.started_at, "d MMM yyyy, h:mm a")}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-muted-foreground">Created by</dt>
                  <dd className="font-medium">{broadcast.administrator.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="font-medium">
                    {formatDate(broadcast.created_at, "d MMM yyyy, h:mm a")}
                  </dd>
                </div>
              </dl>

              {broadcast.status === "sending" && (
                <SendingHint startedAt={broadcast.started_at} />
              )}
            </li>
          );
        })}
      </ul>

      <PaginationBar meta={meta} noun="broadcast" />
    </div>
  );
}
