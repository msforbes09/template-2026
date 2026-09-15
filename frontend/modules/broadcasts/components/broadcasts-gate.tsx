import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { adminCan, PERMISSIONS } from "@/modules/admin/lib/admin-can";

// `notifications-broadcast` gates the whole screen. The API answers 403
// regardless, so this only decides whether it is worth rendering — but the
// message matters: after the 2026-08-27 deploy NO ROLE HOLDS this permission
// until someone grants it, so the expected first experience is an empty
// screen. Saying why beats an unexplained blank.
export async function BroadcastsGate({ children }: { children: React.ReactNode }) {
  if (await adminCan(PERMISSIONS.notificationsBroadcast)) return <>{children}</>;

  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to broadcasts"
      description="Broadcasting needs the notifications-broadcast permission, which is granted separately from every other admin permission. Ask an administrator with access control to add it to your role."
    />
  );
}
