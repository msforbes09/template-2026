import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BroadcastStatus } from "@/types/broadcast";

// draft / sending / sent, as a chip.
//
// `sending` is deliberately NOT an error tone even when it has been running a
// while: the broadcast is fine, it is the queue that is slow. The stuck hint
// lives beside it as text (see BroadcastsTable) rather than turning the state
// red, which would read as "this failed to send" when nothing has failed.
const LABELS: Record<BroadcastStatus, string> = {
  draft: "Draft",
  sending: "Sending",
  sent: "Sent",
};

export function BroadcastStatusBadge({ status }: { status: BroadcastStatus }) {
  return (
    <Badge variant={status === "sent" ? "default" : "secondary"} className="gap-1.5">
      {status === "sending" && <Loader2 aria-hidden className="size-3 animate-spin" />}
      {LABELS[status] ?? status}
    </Badge>
  );
}
