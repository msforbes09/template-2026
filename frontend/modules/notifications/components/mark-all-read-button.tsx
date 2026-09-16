"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/modules/notifications/actions/notification-actions";

// The one interactive control on an otherwise server-rendered page, so it is
// its own leaf rather than a reason to make the list a client component.
//
// router.refresh() rather than local state: the page is server-rendered, and
// the row styling, the unread tab count and the badge in the header all have
// to agree afterwards. Re-rendering from the server is the only way they do.
export function MarkAllReadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsRead();
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success(
            result.data.marked === 1
              ? "1 notification marked as read"
              : `${result.data.marked} notifications marked as read`,
          );
          router.refresh();
        })
      }
    >
      {isPending ? (
        <Loader2 data-icon="inline-start" className="animate-spin" />
      ) : (
        <CheckCheck data-icon="inline-start" />
      )}
      Mark all as read
    </Button>
  );
}
